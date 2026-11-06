import csv
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Count, OuterRef, Q, Subquery, Sum
from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Avg

from core.ai import gemini
from core.ai.service import dismiss_suggestion, generate_suggestion, resolve_suggestion
from core.models import (
    AISuggestion,
    AISuggestionKind,
    AISuggestionStatus,
    IssueCategory,
    AcceptanceRecord,
    ApprovalAction,
    ContractHandling,
    ExternalWork,
    ExternalWorkEvent,
    ExternalWorkStatus,
    Facility,
    Notification,
    RepairPlan,
    RepairPlanStatus,
    RepairRequest,
    RequestStatus,
    RepairType,
    Role,
    Survey,
    User,
)
from core.serializers import (
    AISuggestionSerializer,
    ExternalWorkSerializer,
    FacilitySerializer,
    NotificationSerializer,
    RepairPlanSerializer,
    RequestSerializer,
    UserSerializer,
)
from core.services import (
    effective_inspector,
    is_effective_inspector,
    notify_role,
    record_request_event,
    requests_visible_to,
)


def safe_csv_cell(value):
    if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{value}"
    return value


def require_role(user, *roles):
    if user.role not in roles:
        raise PermissionDenied("Bạn không có quyền thực hiện thao tác này.")


def require_status(obj, *statuses):
    if obj.status not in statuses:
        raise ValidationError(
            {"status": f"Trạng thái hiện tại ({obj.status}) không cho phép thao tác này."}
        )


def request_event(request_obj, actor, action, detail="", timeline_stage=None, timeline_status="COMPLETED"):
    record_request_event(
        request_obj,
        actor,
        action,
        detail,
        timeline_stage=timeline_stage,
        timeline_status=timeline_status,
    )


def get_latest_plan(request_obj):
    return request_obj.repair_plans.order_by("-proposed_at").first()


def get_external_work(request_obj):
    return request_obj.external_works.order_by("-created_at").first()


def set_request_status(request_obj, status_value):
    request_obj.status = status_value
    request_obj.save(update_fields=["status", "updated_at"])


INSPECTOR_ASSIGNABLE_STATUSES = (
    RequestStatus.WAITING_FOR_EXTERNAL_WORK,
    RequestStatus.EXTERNAL_WORK_IN_PROGRESS,
    RequestStatus.WAITING_FOR_ACCEPTANCE,
    RequestStatus.NEEDS_REMEDIATION,
    RequestStatus.WAITING_REMEDIATION_RESPONSE,
)

# Loại phân tích AI -> vai trò được dùng và trạng thái yêu cầu phù hợp.
AI_REQUEST_RULES = {
    AISuggestionKind.TRIAGE: {
        "roles": {Role.FACILITY_ADMIN},
        "statuses": {RequestStatus.NEW, RequestStatus.NEEDS_INFORMATION, RequestStatus.ACCEPTED, RequestStatus.SURVEYING},
    },
    AISuggestionKind.ASSIGN_SURVEY: {
        "roles": {Role.FACILITY_ADMIN},
        "statuses": {RequestStatus.ACCEPTED},
    },
    AISuggestionKind.PLAN: {
        "roles": {Role.FACILITY_ADMIN},
        "statuses": {RequestStatus.WAITING_FOR_PLAN},
    },
    AISuggestionKind.APPROVAL_BRIEF: {
        "roles": {Role.DIRECTOR, Role.FACILITY_ADMIN},
        "statuses": {RequestStatus.WAITING_FOR_APPROVAL},
    },
    AISuggestionKind.ASSIGN_INSPECTOR: {
        "roles": {Role.FACILITY_ADMIN},
        "statuses": set(INSPECTOR_ASSIGNABLE_STATUSES),
    },
    AISuggestionKind.SURVEY_ASSIST: {
        "roles": {Role.STAFF},
        "statuses": {RequestStatus.ACCEPTED, RequestStatus.SURVEYING},
    },
    AISuggestionKind.ACCEPTANCE_CHECKLIST: {
        "roles": {Role.STAFF},
        "statuses": {
            RequestStatus.WAITING_FOR_ACCEPTANCE,
            RequestStatus.NEEDS_REMEDIATION,
            RequestStatus.WAITING_REMEDIATION_RESPONSE,
        },
    },
    AISuggestionKind.CONTRACTOR: {
        "roles": {Role.PROCUREMENT},
        "statuses": {RequestStatus.WAITING_FOR_EXTERNAL_WORK, RequestStatus.EXTERNAL_WORK_IN_PROGRESS},
    },
}


AI_PRIMARY_KIND_BY_STATUS = {
    RequestStatus.NEW: AISuggestionKind.TRIAGE,
    RequestStatus.ACCEPTED: AISuggestionKind.ASSIGN_SURVEY,
    RequestStatus.WAITING_FOR_PLAN: AISuggestionKind.PLAN,
    RequestStatus.WAITING_FOR_APPROVAL: AISuggestionKind.APPROVAL_BRIEF,
    RequestStatus.SURVEYING: AISuggestionKind.SURVEY_ASSIST,
    RequestStatus.WAITING_FOR_ACCEPTANCE: AISuggestionKind.ACCEPTANCE_CHECKLIST,
}


def ai_kind_allowed(kind, request_obj, user):
    rule = AI_REQUEST_RULES.get(kind)
    if rule is None or user.role not in rule["roles"] or request_obj.status not in rule["statuses"]:
        return False
    if kind == AISuggestionKind.ASSIGN_INSPECTOR:
        if request_obj.repair_type != RepairType.EXTERNAL:
            return False
        if request_obj.status == RequestStatus.WAITING_FOR_ACCEPTANCE and request_obj.acceptance_result == "PASS":
            return False
    if kind == AISuggestionKind.SURVEY_ASSIST and request_obj.assigned_staff_id != user.pk:
        return False
    if kind == AISuggestionKind.ACCEPTANCE_CHECKLIST:
        if request_obj.repair_type != RepairType.EXTERNAL or not is_effective_inspector(request_obj, user):
            return False
        if request_obj.status == RequestStatus.WAITING_FOR_ACCEPTANCE and request_obj.acceptance_result == "PASS":
            return False
    if kind == AISuggestionKind.CONTRACTOR and request_obj.repair_type != RepairType.EXTERNAL:
        return False
    return True


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    queryset = User.objects.filter(is_active=True).order_by("last_name", "first_name")

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.query_params.get("role")
        if role:
            if role not in Role.values:
                raise ValidationError({"role": "Vai trò không hợp lệ."})
            queryset = queryset.filter(role=role)
        return queryset


class CurrentUserView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class FacilityViewSet(viewsets.ModelViewSet):
    serializer_class = FacilitySerializer
    queryset = Facility.objects.all()
    lookup_field = "code"
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        require_role(self.request.user, Role.FACILITY_ADMIN)
        serializer.save()

    def perform_update(self, serializer):
        require_role(self.request.user, Role.FACILITY_ADMIN)
        serializer.save()


class RepairRequestViewSet(viewsets.ModelViewSet):
    serializer_class = RequestSerializer
    lookup_field = "code"
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        queryset = requests_visible_to(user).select_related(
            "requester", "assigned_staff", "acceptance_inspector", "facility", "completed_by",
        )
        if self.action in {"list", "retrieve"}:
            queryset = queryset.select_related("contract_action__processed_by").prefetch_related(
                "attachments",
                "history__actor",
                "timeline__actor",
                "acceptance_records__inspector",
                "repair_plans__proposed_by",
                "repair_plans__approved_by",
                "repair_plans__rejected_by",
                "repair_plans__approval_history__actor",
                "external_works__history__actor",
                "external_works__plan",
                "survey__surveyor",
            )
        for param, field in (
            ("status", "status"),
            ("priority", "priority"),
            ("building", "building"),
            ("repairType", "repair_type"),
        ):
            value = self.request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{field: value})
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(title__icontains=search)
                | Q(facility_name__icontains=search)
                | Q(description__icontains=search)
            )
        mine = self.request.query_params.get("mine")
        if mine == "true":
            queryset = queryset.filter(requester=user)
        return queryset.distinct()

    def create(self, request, *args, **kwargs):
        require_role(request.user, Role.REQUESTER)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        obj = serializer.save()
        request_event(
            obj,
            self.request.user,
            "Tạo yêu cầu",
            f"Yêu cầu {obj.code} đã được gửi.",
            timeline_stage="Gửi yêu cầu",
        )
        notify_role(
            Role.FACILITY_ADMIN,
            "Yêu cầu sửa chữa mới",
            f"{obj.code}: {obj.title}",
            request=obj,
            notification_type="info",
        )
        suggestion_id = self.request.data.get("aiSuggestionId")
        if suggestion_id:
            try:
                resolve_suggestion(
                    obj, AISuggestionKind.TRIAGE_PREVIEW, self.request.user,
                    {"priority": obj.priority}, suggestion_id=suggestion_id,
                )
            except (ValueError, DjangoValidationError):
                pass

    def _get_object(self):
        obj = self.get_object()
        return obj

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def accept(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.FACILITY_ADMIN)
        require_status(obj, RequestStatus.NEW)
        set_request_status(obj, RequestStatus.ACCEPTED)
        request_event(obj, request.user, "Tiếp nhận yêu cầu", timeline_stage="Tiếp nhận yêu cầu")
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="request-information")
    @transaction.atomic
    def request_information(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.FACILITY_ADMIN)
        require_status(obj, RequestStatus.NEW, RequestStatus.ACCEPTED)
        note = str(request.data.get("note", "")).strip()
        if not note:
            raise ValidationError({"note": "Vui lòng nhập nội dung cần bổ sung."})
        obj.supplement_note = note
        obj.status = RequestStatus.NEEDS_INFORMATION
        obj.save(update_fields=["supplement_note", "status", "updated_at"])
        request_event(obj, request.user, "Yêu cầu bổ sung thông tin", note)
        notify_role(
            Role.REQUESTER,
            "Yêu cầu bổ sung thông tin",
            f"{obj.code}: {note}",
            request=obj,
            recipient=obj.requester,
            notification_type="warning",
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def supplement(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.REQUESTER)
        if obj.requester_id != request.user.id:
            raise PermissionDenied("Chỉ người tạo yêu cầu mới được bổ sung thông tin.")
        require_status(obj, RequestStatus.NEEDS_INFORMATION)
        note = str(request.data.get("note", "")).strip()
        if not note:
            raise ValidationError({"note": "Vui lòng nhập nội dung thông tin bổ sung."})
        obj.supplement_note = note
        obj.status = RequestStatus.ACCEPTED
        obj.save(update_fields=["supplement_note", "status", "updated_at"])
        request_event(obj, request.user, "Bổ sung thông tin", note)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def assign(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.FACILITY_ADMIN)
        require_status(obj, RequestStatus.ACCEPTED)
        staff_code = request.data.get("staffId")
        staff = User.objects.filter(code=staff_code, role=Role.STAFF, is_active=True).first()
        if staff is None:
            raise ValidationError({"staffId": "Cán bộ phụ trách không tồn tại hoặc không hợp lệ."})
        obj.assigned_staff = staff
        obj.assigned_at = timezone.now()
        obj.status = RequestStatus.SURVEYING
        obj.save(update_fields=["assigned_staff", "assigned_at", "status", "updated_at"])
        request_event(
            obj,
            request.user,
            "Phân công cán bộ phụ trách",
            f"Đã phân công cho {staff.get_full_name() or staff.username}.",
            timeline_stage="Phân công cán bộ",
        )
        notify_role(
            Role.STAFF,
            "Bạn được phân công yêu cầu sửa chữa",
            f"{obj.code}: {obj.title}",
            request=obj,
            recipient=staff,
        )
        resolve_suggestion(
            obj, AISuggestionKind.ASSIGN_SURVEY, request.user,
            {"staff_code": staff.code, "staff_name": staff.get_full_name()},
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def survey(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.STAFF)
        if obj.assigned_staff_id != request.user.id:
            raise PermissionDenied("Chỉ cán bộ được phân công mới được cập nhật khảo sát.")
        require_status(obj, RequestStatus.SURVEYING, RequestStatus.ACCEPTED)
        data = request.data
        findings = str(data.get("findings", data.get("currentCondition", ""))).strip()
        root_cause = str(data.get("rootCause", data.get("cause", ""))).strip()
        if not findings or not root_cause:
            raise ValidationError({"survey": "Hiện trạng và nguyên nhân là bắt buộc."})
        survey_date = data.get("surveyDate") or timezone.now()
        if isinstance(survey_date, str):
            from django.utils.dateparse import parse_datetime, parse_date

            survey_date = parse_datetime(survey_date) or parse_date(survey_date)
            if survey_date is None:
                raise ValidationError({"surveyDate": "Ngày khảo sát không hợp lệ."})
            if not hasattr(survey_date, "hour"):
                survey_date = timezone.make_aware(
                    timezone.datetime.combine(survey_date, timezone.datetime.min.time())
                )
        estimated_cost = data.get("estimatedCost")
        if estimated_cost not in (None, ""):
            try:
                if Decimal(str(estimated_cost)) < 0:
                    raise ValueError
            except (TypeError, ValueError, ArithmeticError):
                raise ValidationError({"estimatedCost": "Dự toán phải là số không âm."})
        can_repair_immediately = bool(
            data.get("canRepairImmediately")
            or data.get("repairAction") == "IMMEDIATE"
            or data.get("assessmentType") == "IMMEDIATE"
        )
        Survey.objects.update_or_create(
            request=obj,
            defaults={
                "survey_date": survey_date,
                "findings": findings,
                "root_cause": root_cause,
                "damage_level": data.get("damageLevel", ""),
                "recommended_action": data.get("recommendedAction", data.get("recommendation", "")),
                "estimated_time": data.get("estimatedTime", ""),
                "estimated_cost": estimated_cost or None,
                "notes": data.get("notes", ""),
                "surveyor": request.user,

            },
        )
        resolve_suggestion(
            obj, AISuggestionKind.SURVEY_ASSIST, request.user,
            {
                "can_repair_immediately": can_repair_immediately,
                "estimated_cost": int(Decimal(str(estimated_cost))) if estimated_cost not in (None, "") else None,
            },
        )
        if can_repair_immediately:
            obj.status = RequestStatus.INTERNAL_REPAIR
            obj.repair_type = RepairType.INTERNAL
            obj.save(update_fields=["status", "repair_type", "updated_at"])
            request_event(
                obj,
                request.user,
                "Ghi nhận kết quả khảo sát",
                f"Hiện trạng: {findings} | Đánh giá: Có thể sửa chữa ngay -> Chuyển thẳng sang Bước 5 (Sửa chữa nội bộ).",
                timeline_stage="Khảo sát hiện trạng",
            )
            notify_role(
                Role.STAFF,
                "Bắt đầu sửa chữa nội bộ",
                f"{obj.code}: {obj.title} đã chuyển sang bước sửa chữa nội bộ.",
                request=obj,
                notification_type="info",
            )
        else:
            obj.status = RequestStatus.WAITING_FOR_PLAN
            obj.save(update_fields=["status", "updated_at"])
            request_event(
                obj,
                request.user,
                "Ghi nhận kết quả khảo sát",
                f"Hiện trạng: {findings} | Đánh giá: Báo về phòng CSVC họp bàn xem xét -> Dừng tại Bước 4 (Chờ phương án).",
                timeline_stage="Khảo sát hiện trạng",
            )
            notify_role(
                Role.FACILITY_ADMIN,
                "Yêu cầu đã khảo sát xong",
                f"{obj.code}: {obj.title} đang chờ lập phương án.",
                request=obj,
                notification_type="info",
            )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="repair-plan")
    @transaction.atomic
    def create_repair_plan(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.FACILITY_ADMIN)
        require_status(obj, RequestStatus.WAITING_FOR_PLAN)
        data = request.data
        title = str(data.get("title", "")).strip()
        repair_type = data.get("repairType")
        if not title:
            raise ValidationError({"title": "Tiêu đề phương án là bắt buộc."})
        if repair_type not in RepairType.values:
            raise ValidationError({"repairType": "Hình thức sửa chữa không hợp lệ."})
        try:
            estimated_cost = Decimal(str(data.get("estimatedCost", 0)))
            if not estimated_cost.is_finite() or estimated_cost < 0:
                raise ValueError
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError({"estimatedCost": "Dự toán phải là số không âm."})
        requires_approval = bool(data.get("needsApproval", data.get("requiresApproval", False)))
        requires_approval = requires_approval or repair_type == RepairType.EXTERNAL
        plan = RepairPlan.objects.create(
            request=obj,
            title=title,
            repair_type=repair_type,
            estimated_cost=estimated_cost,
            estimated_duration=data.get("estimatedDuration", data.get("estimatedTime", "")),
            materials=data.get("materials", ""),
            description=data.get("description", ""),
            proposed_by=request.user,
            requires_approval=requires_approval,
            approval_status=(
                RepairPlanStatus.PENDING if requires_approval else RepairPlanStatus.APPROVED
            ),
            approved_by=None,
            approved_at=None if requires_approval else timezone.now(),
        )
        obj.repair_type = repair_type
        obj.needs_approval = requires_approval
        obj.estimated_cost = estimated_cost
        obj.status = (
            RequestStatus.WAITING_FOR_APPROVAL
            if requires_approval
            else RequestStatus.INTERNAL_REPAIR
        )
        obj.save(
            update_fields=[
                "repair_type", "needs_approval", "estimated_cost", "status", "updated_at"
            ]
        )
        ApprovalAction.objects.create(
            plan=plan,
            actor=request.user,
            action="SUBMITTED",
            comments="Gửi phê duyệt" if requires_approval else "Gửi phương án nội bộ",
        )
        if requires_approval:
            notify_role(
                Role.DIRECTOR,
                "Phương án chờ phê duyệt",
                f"{plan.code}: {plan.title}",
                request=obj,
            )
        else:
            ApprovalAction.objects.create(
                plan=plan,
                actor=request.user,
                action="AUTO_APPROVED",
                comments="Phương án nội bộ không yêu cầu Ban Giám hiệu phê duyệt.",
            )
        request_event(
            obj,
            request.user,
            "Lập phương án xử lý",
            f"{plan.title} | Hình thức: {repair_type} | Dự toán: {estimated_cost}",
            timeline_stage="Lập phương án sửa chữa",
        )
        resolve_suggestion(
            obj, AISuggestionKind.PLAN, request.user,
            {"repair_type": repair_type, "estimated_cost": int(estimated_cost), "title": title},
        )
        return Response(RepairPlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def approve(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.DIRECTOR)
        require_status(obj, RequestStatus.WAITING_FOR_APPROVAL)
        plan = get_latest_plan(obj)
        if plan is None or plan.approval_status != RepairPlanStatus.PENDING:
            raise ValidationError({"plan": "Không có phương án đang chờ phê duyệt."})
        plan.approval_status = RepairPlanStatus.APPROVED
        plan.approved_by = request.user
        plan.approved_at = timezone.now()
        plan.save(update_fields=["approval_status", "approved_by", "approved_at"])
        ApprovalAction.objects.create(plan=plan, actor=request.user, action="APPROVED")
        obj.status = (
            RequestStatus.INTERNAL_REPAIR
            if plan.repair_type == RepairType.INTERNAL
            else RequestStatus.WAITING_FOR_EXTERNAL_WORK
        )
        obj.save(update_fields=["status", "updated_at"])
        request_event(obj, request.user, "Phê duyệt phương án", "Ban Giám hiệu đã phê duyệt phương án.")
        if plan.repair_type == RepairType.EXTERNAL:
            work, created = ExternalWork.objects.get_or_create(
                request=obj,
                plan=plan,
                defaults={
                    "title": plan.title,
                    "status": ExternalWorkStatus.PENDING,
                },
            )
            if created:
                ExternalWorkEvent.objects.create(
                    work=work, actor=request.user, action="Tiếp nhận công việc"
                )
        resolve_suggestion(obj, AISuggestionKind.APPROVAL_BRIEF, request.user, {"decision": "APPROVED"})
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def reject(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.DIRECTOR)
        require_status(obj, RequestStatus.WAITING_FOR_APPROVAL)
        reason = str(request.data.get("reason", "")).strip()
        if not reason:
            raise ValidationError({"reason": "Lý do từ chối là bắt buộc."})
        plan = get_latest_plan(obj)
        if plan is None or plan.approval_status != RepairPlanStatus.PENDING:
            raise ValidationError({"plan": "Không có phương án đang chờ phê duyệt."})
        plan.approval_status = RepairPlanStatus.REJECTED
        plan.rejected_by = request.user
        plan.rejected_at = timezone.now()
        plan.rejection_reason = reason
        plan.save(
            update_fields=["approval_status", "rejected_by", "rejected_at", "rejection_reason"]
        )
        ApprovalAction.objects.create(
            plan=plan, actor=request.user, action="REJECTED", comments=reason
        )
        obj.status = RequestStatus.WAITING_FOR_PLAN
        obj.rejection_reason = reason
        obj.save(update_fields=["status", "rejection_reason", "updated_at"])
        request_event(
            obj,
            request.user,
            "Từ chối phương án",
            reason,
            timeline_stage="Từ chối phương án",
            timeline_status="FAILED",
        )
        notify_role(
            Role.FACILITY_ADMIN,
            "Phương án bị từ chối",
            f"{obj.code}: {reason}",
            request=obj,
            notification_type="warning",
        )
        resolve_suggestion(
            obj, AISuggestionKind.APPROVAL_BRIEF, request.user, {"decision": "REJECTED", "reason": reason}
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="internal-result")
    @transaction.atomic
    def internal_result(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.STAFF)
        if obj.assigned_staff_id != request.user.id:
            raise PermissionDenied("Chỉ cán bộ được phân công mới được cập nhật kết quả.")
        require_status(obj, RequestStatus.INTERNAL_REPAIR)
        if obj.repair_type != RepairType.INTERNAL:
            raise ValidationError({"repairType": "Yêu cầu này không phải sửa chữa nội bộ."})
        work_done = str(request.data.get("workDone", "")).strip()
        if not work_done:
            raise ValidationError({"workDone": "Mô tả công việc đã thực hiện là bắt buộc."})
        result = {
            "workDone": work_done,
            "partsReplaced": request.data.get("partsReplaced", ""),
            "testNotes": request.data.get("testNotes", ""),
            "completedAt": timezone.now().isoformat(),
            "technician": request.user.get_full_name() or request.user.username,
        }
        obj.internal_repair_result = result
        obj.status = RequestStatus.WAITING_FOR_CONFIRMATION
        obj.save(update_fields=["internal_repair_result", "status", "updated_at"])
        request_event(
            obj,
            request.user,
            "Hoàn thành sửa chữa nội bộ",
            work_done,
            timeline_stage="Thực hiện sửa chữa nội bộ",
        )
        notify_role(
            Role.REQUESTER,
            "Yêu cầu chờ xác nhận kết quả",
            f"{obj.code}: Công việc sửa chữa đã hoàn thành.",
            request=obj,
            recipient=obj.requester,
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def confirm(self, request, code=None):
        obj = self._get_object()
        if obj.repair_type == RepairType.INTERNAL:
            require_role(request.user, Role.REQUESTER)
            if obj.requester_id != request.user.id:
                raise PermissionDenied("Chỉ người tạo yêu cầu mới được xác nhận.")
            require_status(obj, RequestStatus.WAITING_FOR_CONFIRMATION)
            result = request.data.get("result", "PASS")
            feedback = str(request.data.get("feedback", "")).strip()
            if result == "PASS":
                obj.status = RequestStatus.COMPLETED
                obj.completed_at = timezone.now()
                obj.completed_by = request.user
                action = "Xác nhận hoàn thành"
            elif result == "FAIL":
                if not feedback:
                    raise ValidationError({"feedback": "Vui lòng nhập lý do chưa đạt."})
                obj.status = RequestStatus.INTERNAL_REPAIR
                action = "Phản hồi kết quả chưa đạt"
            else:
                raise ValidationError({"result": "Kết quả phải là PASS hoặc FAIL."})
        else:
            require_role(request.user, Role.STAFF)
            if not is_effective_inspector(obj, request.user):
                raise PermissionDenied("Chỉ cán bộ được phân công nghiệm thu mới được xác nhận.")
            require_status(obj, RequestStatus.WAITING_FOR_ACCEPTANCE)
            if obj.acceptance_result != "PASS":
                raise ValidationError({"acceptanceResult": "Chỉ được hoàn thành sau nghiệm thu ĐẠT."})
            obj.status = RequestStatus.COMPLETED
            obj.completed_at = timezone.now()
            obj.completed_by = request.user
            feedback = "Nghiệm thu đạt, đã đóng hồ sơ công việc hoàn thành."
            action = "Xác nhận hoàn thành sửa chữa thuê ngoài"
            work = get_external_work(obj)
            if work:
                work.status = ExternalWorkStatus.COMPLETED
                work.save(update_fields=["status", "updated_at"])
        obj.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])
        request_event(
            obj,
            request.user,
            action,
            feedback,
            timeline_stage="Xác nhận hoàn thành",
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="update-external-work")
    @transaction.atomic
    def update_external_work(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.PROCUREMENT)
        require_status(
            obj,
            RequestStatus.WAITING_FOR_EXTERNAL_WORK,
            RequestStatus.EXTERNAL_WORK_IN_PROGRESS,
            RequestStatus.NEEDS_REMEDIATION,
            RequestStatus.WAITING_REMEDIATION_RESPONSE,
        )
        work = get_external_work(obj)
        if work is None:
            raise ValidationError({"externalWork": "Chưa có hồ sơ công việc thuê ngoài."})
        contractor = str(request.data.get("contractor", work.contractor)).strip()
        if not contractor:
            raise ValidationError({"contractor": "Tên đơn vị thi công là bắt buộc."})
        try:
            progress = int(request.data.get("progress", work.progress))
            if not 0 <= progress <= 100:
                raise ValueError
        except (TypeError, ValueError):
            raise ValidationError({"progress": "Tiến độ phải nằm trong khoảng 0-100."})
        work.contractor = contractor
        work.contractor_contact = request.data.get(
            "contractorContact", request.data.get("contractorPhone", work.contractor_contact)
        )
        work.start_date = request.data.get("startDate") or work.start_date
        work.expected_end_date = request.data.get("expectedEndDate") or work.expected_end_date
        work.progress = progress
        work.work_notes = request.data.get("workNotes", request.data.get("notes", work.work_notes))
        work.work_result = request.data.get("workResult", work.work_result)
        work.status = (
            ExternalWorkStatus.WORK_COMPLETED if progress == 100 else ExternalWorkStatus.IN_PROGRESS
        )
        if progress == 100:
            work.actual_end_date = timezone.localdate()
        work.save()
        ExternalWorkEvent.objects.create(
            work=work,
            actor=request.user,
            action="Cập nhật tiến độ",
            detail=f"{contractor} | {progress}% | {work.work_notes}",
        )
        resolve_suggestion(obj, AISuggestionKind.CONTRACTOR, request.user, {"contractor": contractor})
        obj.contractor = contractor
        obj.external_progress = progress
        obj.status = RequestStatus.EXTERNAL_WORK_IN_PROGRESS
        obj.save(update_fields=["contractor", "external_progress", "status", "updated_at"])
        request_event(
            obj,
            request.user,
            "Cập nhật tiến độ thuê ngoài",
            f"Đơn vị: {contractor} | Tiến độ: {progress}%",
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="external-work-done")
    @transaction.atomic
    def external_work_done(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.PROCUREMENT)
        require_status(
            obj, RequestStatus.WAITING_FOR_EXTERNAL_WORK, RequestStatus.EXTERNAL_WORK_IN_PROGRESS
        )
        work = get_external_work(obj)
        if work is None:
            raise ValidationError({"externalWork": "Chưa có hồ sơ công việc thuê ngoài."})
        if not work.contractor:
            raise ValidationError({"contractor": "Cần ghi nhận đơn vị thi công trước khi hoàn tất."})
        result = str(
            request.data.get("workResult")
            or work.work_result
            or "Đơn vị thi công báo hoàn thành công việc."
        ).strip()
        work.status = ExternalWorkStatus.WAITING_ACCEPTANCE
        work.progress = 100
        work.work_result = result
        work.actual_end_date = timezone.localdate()
        work.work_completed_at = timezone.now()
        work.save()
        ExternalWorkEvent.objects.create(
            work=work, actor=request.user, action="Cập nhật kết quả", detail=result
        )
        obj.status = RequestStatus.WAITING_FOR_ACCEPTANCE
        obj.external_progress = 100
        obj.save(update_fields=["status", "external_progress", "updated_at"])
        request_event(
            obj,
            request.user,
            "Hoàn thành thi công - Chuyển nghiệm thu",
            result,
            timeline_stage="Hoàn thành thi công thuê ngoài",
        )
        notify_role(
            Role.STAFF,
            "Công việc thuê ngoài chờ nghiệm thu",
            f"{obj.code}: {obj.title}",
            request=obj,
            recipient=effective_inspector(obj),
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="acceptance")
    @transaction.atomic
    def acceptance(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.STAFF)
        if not is_effective_inspector(obj, request.user):
            raise PermissionDenied("Chỉ cán bộ được phân công nghiệm thu mới được nghiệm thu.")
        require_status(
            obj,
            RequestStatus.WAITING_FOR_ACCEPTANCE,
            RequestStatus.NEEDS_REMEDIATION,
            RequestStatus.WAITING_REMEDIATION_RESPONSE,
            RequestStatus.OVERDUE_REMEDIATION,
        )
        result = request.data.get("result")
        check_items = str(request.data.get("checkItems", "")).strip()
        remediation_notes = str(request.data.get("remediationNotes", "")).strip()
        if result not in {"PASS", "FAIL"}:
            raise ValidationError({"result": "Kết quả phải là PASS hoặc FAIL."})
        if not check_items:
            raise ValidationError({"checkItems": "Nội dung kiểm tra thực tế là bắt buộc."})
        if result == "FAIL" and not remediation_notes:
            raise ValidationError({"remediationNotes": "Nội dung cần khắc phục là bắt buộc."})
        inspection_date = request.data.get("inspectionDate") or timezone.localdate()
        record = AcceptanceRecord.objects.create(
            request=obj,
            inspection_date=inspection_date,
            inspector=request.user,
            check_items=check_items,
            result=result,
            notes=request.data.get("notes", ""),
            remediation_notes=remediation_notes,
        )
        obj.acceptance_result = result
        resolve_suggestion(
            obj, AISuggestionKind.ACCEPTANCE_CHECKLIST, request.user,
            {"check_items": check_items, "result": result},
        )
        work = get_external_work(obj)
        if result == "PASS":
            obj.status = RequestStatus.WAITING_FOR_ACCEPTANCE
            obj.remediation_status = "RESOLVED_WAITING_REINSPECTION"
            if work:
                work.status = ExternalWorkStatus.WAITING_ACCEPTANCE
                work.save(update_fields=["status", "updated_at"])
            detail = f"Nghiệm thu đạt yêu cầu. {record.notes}"
            stage_status = "COMPLETED"
            title = "Nghiệm thu ĐẠT"
        else:
            now = timezone.now()
            obj.status = RequestStatus.WAITING_REMEDIATION_RESPONSE
            obj.remediation_notes = remediation_notes
            obj.remediation_requested_at = now
            obj.remediation_deadline = now + timedelta(hours=72)
            obj.remediation_hours = 72
            obj.remediation_response_received = False
            obj.remediation_status = "WAITING"
            if work:
                work.status = ExternalWorkStatus.NEEDS_REMEDIATION
                work.remediation_content = remediation_notes
                work.remediation_requested_at = now
                work.remediation_deadline = now + timedelta(hours=72)
                work.save()
            detail = f"Không đạt. Cần khắc phục trong 72 giờ: {remediation_notes}"
            stage_status = "FAILED"
            title = "Nghiệm thu KHÔNG ĐẠT - cần khắc phục"
            notify_role(
                Role.PROCUREMENT,
                "Yêu cầu khắc phục sau nghiệm thu",
                f"{obj.code}: {remediation_notes}",
                request=obj,
                notification_type="warning",
            )
        obj.save()
        request_event(
            obj,
            request.user,
            f"Nghiệm thu: {result}",
            detail,
            timeline_stage=title,
            timeline_status=stage_status,
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="provider-response")
    @transaction.atomic
    def provider_response(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.PROCUREMENT)
        require_status(obj, RequestStatus.WAITING_REMEDIATION_RESPONSE)
        note = str(request.data.get("responseNote", "")).strip()
        if not note:
            raise ValidationError({"responseNote": "Nội dung phản hồi của nhà cung cấp là bắt buộc."})
        response_date = request.data.get("responseDate") or timezone.localdate()
        obj.status = RequestStatus.WAITING_FOR_ACCEPTANCE
        obj.remediation_response_received = True
        obj.remediation_response_date = response_date
        obj.remediation_response_note = note
        obj.remediation_status = "RESOLVED_WAITING_REINSPECTION"
        obj.save(update_fields=[
            "status", "remediation_response_received", "remediation_response_date",
            "remediation_response_note", "remediation_status", "updated_at",
        ])
        work = get_external_work(obj)
        if work:
            work.status = ExternalWorkStatus.WAITING_ACCEPTANCE
            work.work_notes = note
            work.save(update_fields=["status", "work_notes", "updated_at"])
            ExternalWorkEvent.objects.create(
                work=work, actor=request.user, action="Nhà cung cấp báo đã khắc phục", detail=note
            )
        request_event(
            obj,
            request.user,
            "Ghi nhận hoàn thành khắc phục từ nhà cung cấp",
            note,
            timeline_stage="Nhà cung cấp đã khắc phục - Chờ nghiệm thu lại",
        )
        notify_role(
            Role.STAFF,
            "Công việc đã khắc phục, chờ nghiệm thu lại",
            f"{obj.code}: {note}",
            request=obj,
            recipient=effective_inspector(obj),
        )
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="contract-handling")
    @transaction.atomic
    def contract_handling(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.STAFF)
        if not is_effective_inspector(obj, request.user):
            raise PermissionDenied("Chỉ cán bộ được phân công nghiệm thu mới được ghi nhận xử lý hợp đồng.")
        require_status(obj, RequestStatus.WAITING_REMEDIATION_RESPONSE)
        if not obj.remediation_deadline or timezone.now() < obj.remediation_deadline:
            raise ValidationError({"remediationDeadline": "Chưa hết thời hạn khắc phục 72 giờ."})
        actions = request.data.get("actions", [])
        overdue_note = str(request.data.get("overdueNote", "")).strip()
        if (
            not isinstance(actions, list)
            or not actions
            or not all(isinstance(item, str) and item.strip() for item in actions)
        ):
            raise ValidationError({"actions": "Chọn ít nhất một biện pháp xử lý hợp đồng."})
        if not overdue_note:
            raise ValidationError({"overdueNote": "Báo cáo tình trạng sau 72 giờ là bắt buộc."})
        try:
            penalty_amount = (
                Decimal(str(request.data["penaltyAmount"]))
                if request.data.get("penaltyAmount") not in (None, "")
                else None
            )
            deduction_amount = (
                Decimal(str(request.data["deductionAmount"]))
                if request.data.get("deductionAmount") not in (None, "")
                else None
            )
            if any(
                amount is not None and (not amount.is_finite() or amount < 0)
                for amount in (penalty_amount, deduction_amount)
            ):
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError({"amount": "Tiền phạt và khấu trừ phải là số không âm."})
        suspension_until = request.data.get("paymentSuspensionUntil") or None
        extension_until = request.data.get("contractExtensionUntil") or None
        for field_name, raw_date in (
            ("paymentSuspensionUntil", suspension_until),
            ("contractExtensionUntil", extension_until),
        ):
            if raw_date and (
                not isinstance(raw_date, str) or parse_date(raw_date) is None
            ):
                raise ValidationError({field_name: "Ngày phải theo định dạng YYYY-MM-DD."})
        handling_data = {
            "actions": actions,
            "violationClause": request.data.get("violationClause", ""),
            "overdueNote": overdue_note,
            "penaltyAmount": str(penalty_amount) if penalty_amount is not None else None,
            "deductionAmount": str(deduction_amount) if deduction_amount is not None else None,
            "paymentSuspensionUntil": suspension_until,
            "contractExtensionUntil": extension_until,
            "terminationReason": request.data.get("terminationReason", ""),
            "contractNotes": request.data.get("contractNotes", ""),
            "processedAt": timezone.now().isoformat(),
            "processedBy": request.user.get_full_name() or request.user.username,
            "status": "PROCESSED",
        }
        ContractHandling.objects.update_or_create(
            request=obj,
            defaults={
                "actions": actions,
                "violation_clause": handling_data["violationClause"],
                "overdue_note": overdue_note,
                "penalty_amount": penalty_amount,
                "deduction_amount": deduction_amount,
                "payment_suspension_until": suspension_until,
                "contract_extension_until": extension_until,
                "termination_reason": handling_data["terminationReason"],
                "contract_notes": handling_data["contractNotes"],
                "processed_by": request.user,
                "status": "PROCESSED",
            },
        )
        obj.status = RequestStatus.OVERDUE_REMEDIATION
        obj.remediation_status = "OVERDUE_FAILED"
        obj.save(update_fields=["status", "remediation_status", "updated_at"])
        work = get_external_work(obj)
        if work:
            work.status = ExternalWorkStatus.OVERDUE_REMEDIATION
            work.save(update_fields=["status", "updated_at"])
        request_event(
            obj,
            request.user,
            "Xử lý hợp đồng sau 72 giờ quá hạn",
            f"{'; '.join(actions)}. {overdue_note}",
            timeline_stage="Sau 72 giờ: Cập nhật chưa hoàn thành & Xử lý hợp đồng",
            timeline_status="FAILED",
        )
        notify_role(
            Role.DIRECTOR,
            "Xử lý hợp đồng: quá hạn khắc phục",
            f"{obj.code}: Đã ghi nhận biện pháp {', '.join(actions)}.",
            request=obj,
            notification_type="warning",
        )
        return Response(self.get_serializer(obj).data)

    # ------------------------------------------------------------------
    # Phân loại & mức độ (Quản trị CSVC xác nhận, có thể theo đề xuất AI)
    # ------------------------------------------------------------------
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def triage(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.FACILITY_ADMIN)
        require_status(
            obj, RequestStatus.NEW, RequestStatus.NEEDS_INFORMATION, RequestStatus.ACCEPTED,
            RequestStatus.SURVEYING,
        )
        priority = str(request.data.get("priority", obj.priority)).upper()
        category = str(request.data.get("issueCategory", obj.issue_category or "")).upper()
        if priority not in {"LOW", "MEDIUM", "HIGH", "URGENT"}:
            raise ValidationError({"priority": "Mức độ ưu tiên không hợp lệ."})
        if category not in IssueCategory.values:
            raise ValidationError({"issueCategory": "Loại sự cố không hợp lệ."})
        old_priority = obj.priority
        obj.priority = priority
        obj.issue_category = category
        obj.save(update_fields=["priority", "issue_category", "updated_at"])
        note = str(request.data.get("note", "")).strip()
        request_event(
            obj,
            request.user,
            "Đánh giá phân loại & mức độ",
            f"Loại: {IssueCategory(category).label} | Mức độ: {old_priority} -> {priority}"
            + (f" | {note}" if note else ""),
        )
        resolve_suggestion(
            obj, AISuggestionKind.TRIAGE, request.user, {"priority": priority, "category": category}
        )
        return Response(self.get_serializer(obj).data)

    # ------------------------------------------------------------------
    # Phân công người nghiệm thu công việc thuê ngoài
    # ------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="assign-inspector")
    @transaction.atomic
    def assign_inspector(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.FACILITY_ADMIN)
        if obj.repair_type != RepairType.EXTERNAL:
            raise ValidationError({"repairType": "Chỉ phân công nghiệm thu cho công việc thuê ngoài."})
        require_status(obj, *INSPECTOR_ASSIGNABLE_STATUSES)
        if obj.status == RequestStatus.WAITING_FOR_ACCEPTANCE and obj.acceptance_result == "PASS":
            raise ValidationError({"status": "Đã nghiệm thu đạt, không thể đổi người nghiệm thu."})
        staff = User.objects.filter(
            code=request.data.get("staffId"), role=Role.STAFF, is_active=True
        ).first()
        if staff is None:
            raise ValidationError({"staffId": "Cán bộ nghiệm thu không tồn tại hoặc không hợp lệ."})
        obj.acceptance_inspector = staff
        obj.inspector_assigned_at = timezone.now()
        obj.save(update_fields=["acceptance_inspector", "inspector_assigned_at", "updated_at"])
        note = str(request.data.get("note", "")).strip()
        request_event(
            obj,
            request.user,
            "Phân công cán bộ nghiệm thu",
            f"Giao nghiệm thu cho {staff.get_full_name() or staff.username}." + (f" {note}" if note else ""),
            timeline_stage="Phân công nghiệm thu",
        )
        notify_role(
            Role.STAFF,
            "Bạn được phân công nghiệm thu",
            f"{obj.code}: {obj.title}",
            request=obj,
            recipient=staff,
        )
        resolve_suggestion(
            obj, AISuggestionKind.ASSIGN_INSPECTOR, request.user,
            {"staff_code": staff.code, "staff_name": staff.get_full_name()},
        )
        return Response(self.get_serializer(obj).data)

    # ------------------------------------------------------------------
    # Trợ lý AI theo từng yêu cầu
    # ------------------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="ai")
    def ai_latest(self, request, code=None):
        obj = self._get_object()
        kinds = [kind for kind, rule in AI_REQUEST_RULES.items() if request.user.role in rule["roles"]]
        latest = {}
        for suggestion in obj.ai_suggestions.filter(kind__in=kinds).select_related("created_by", "decided_by"):
            latest.setdefault(suggestion.kind, suggestion)
        primary = AI_PRIMARY_KIND_BY_STATUS.get(obj.status)
        available = sorted(
            (kind for kind in kinds if ai_kind_allowed(kind, obj, request.user)),
            key=lambda kind: 0 if kind == primary else 1,
        )
        return Response({
            "available": available,
            "latest": {kind: AISuggestionSerializer(s).data for kind, s in latest.items()},
            "aiEnabled": gemini.is_configured(),
        })

    @action(detail=True, methods=["post"], url_path=r"ai/(?P<kind>[A-Za-z_-]+)")
    def ai_suggest(self, request, code=None, kind=None):
        obj = self._get_object()
        kind = str(kind).upper().replace("-", "_")
        if kind not in AI_REQUEST_RULES:
            raise ValidationError({"kind": "Loại phân tích AI không hợp lệ."})
        if request.user.role not in AI_REQUEST_RULES[kind]["roles"]:
            raise PermissionDenied("Vai trò của bạn không dùng được loại phân tích này.")
        if not ai_kind_allowed(kind, obj, request.user):
            raise ValidationError({"status": "Trạng thái hiện tại không phù hợp với loại phân tích này."})
        suggestion = generate_suggestion(kind, request.user, request_obj=obj)
        return Response(AISuggestionSerializer(suggestion).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, code=None):
        obj = self._get_object()
        require_role(request.user, Role.REQUESTER)
        if obj.requester_id != request.user.id:
            raise PermissionDenied("Chỉ người tạo yêu cầu mới được hủy.")
        require_status(obj, RequestStatus.NEW, RequestStatus.NEEDS_INFORMATION)
        obj.status = RequestStatus.CANCELLED
        obj.save(update_fields=["status", "updated_at"])
        request_event(obj, request.user, "Hủy yêu cầu")
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="simulate-overdue")
    @transaction.atomic
    def simulate_overdue(self, request, code=None):
        if not settings.DEBUG:
            raise PermissionDenied("Tính năng mô phỏng chỉ khả dụng ở môi trường phát triển.")
        obj = self._get_object()
        require_role(request.user, Role.STAFF)
        if not is_effective_inspector(obj, request.user):
            raise PermissionDenied("Chỉ cán bộ được phân công nghiệm thu mới được mô phỏng.")
        require_status(obj, RequestStatus.WAITING_REMEDIATION_RESPONSE)
        if not obj.remediation_deadline:
            raise ValidationError({"remediationDeadline": "Yêu cầu chưa có hạn khắc phục."})
        obj.remediation_deadline = timezone.now() - timedelta(seconds=1)
        obj.save(update_fields=["remediation_deadline", "updated_at"])
        request_event(obj, request.user, "Mô phỏng hết thời hạn khắc phục 72 giờ")
        return Response(self.get_serializer(obj).data)


class RepairPlanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RepairPlanSerializer
    queryset = RepairPlan.objects.select_related("request", "proposed_by", "approved_by", "rejected_by").prefetch_related(
        "approval_history__actor"
    )
    lookup_field = "code"

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == Role.REQUESTER:
            queryset = queryset.filter(request__requester=user)
        elif user.role == Role.STAFF:
            queryset = queryset.filter(
                Q(request__assigned_staff=user) | Q(request__acceptance_inspector=user)
            ).distinct()
        elif user.role == Role.PROCUREMENT:
            queryset = queryset.filter(request__external_works__isnull=False).distinct()
        status_value = self.request.query_params.get("approvalStatus")
        if status_value:
            queryset = queryset.filter(approval_status=status_value)
        request_code = self.request.query_params.get("requestId")
        if request_code:
            queryset = queryset.filter(request__code=request_code)
        return queryset


class ExternalWorkViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ExternalWorkSerializer
    queryset = ExternalWork.objects.select_related("request", "plan").prefetch_related("history__actor")
    lookup_field = "code"

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role == Role.REQUESTER:
            queryset = queryset.filter(request__requester=self.request.user)
        elif self.request.user.role == Role.STAFF:
            queryset = queryset.filter(
                Q(request__assigned_staff=self.request.user)
                | Q(request__acceptance_inspector=self.request.user)
            ).distinct()
        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer
    queryset = Notification.objects.all()
    lookup_field = "pk"

    def get_queryset(self):
        user = self.request.user
        return Notification.objects.select_related("request").filter(
            Q(recipient=user) | Q(recipient__isnull=True, target_role=user.role)
        ).distinct()

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
        return Response({"markedRead": True})


class ReportSummaryView(APIView):
    def get_queryset(self, request):
        queryset = requests_visible_to(request.user)
        building = request.query_params.get("building")
        repair_type = request.query_params.get("repairType")
        if building:
            queryset = queryset.filter(building=building)
        if repair_type:
            queryset = queryset.filter(repair_type=repair_type)
        return queryset

    def get(self, request):
        queryset = self.get_queryset(request)
        remediation_statuses = (
            RequestStatus.NEEDS_REMEDIATION,
            RequestStatus.WAITING_REMEDIATION_RESPONSE,
            RequestStatus.OVERDUE_REMEDIATION,
        )
        in_progress_statuses = (
            RequestStatus.ACCEPTED,
            RequestStatus.SURVEYING,
            RequestStatus.WAITING_FOR_PLAN,
            RequestStatus.INTERNAL_REPAIR,
            RequestStatus.WAITING_FOR_EXTERNAL_WORK,
            RequestStatus.EXTERNAL_WORK_IN_PROGRESS,
        )
        status_data = list(
            queryset.values("status").annotate(count=Count("id")).order_by("status")
        )
        repair_type_data = list(
            queryset.exclude(repair_type__isnull=True)
            .values("repair_type")
            .annotate(count=Count("id"), estimated_cost=Sum("estimated_cost"))
            .order_by("repair_type")
        )
        building_data = list(
            queryset.values("building")
            .annotate(count=Count("id"), estimated_cost=Sum("estimated_cost"))
            .order_by("building")
        )
        return Response(
            {
                "total": queryset.count(),
                "completed": queryset.filter(status=RequestStatus.COMPLETED).count(),
                "inProgress": queryset.filter(status__in=in_progress_statuses).count(),
                "waitingReview": queryset.filter(
                    status__in=(
                        RequestStatus.WAITING_FOR_ACCEPTANCE,
                        RequestStatus.WAITING_FOR_CONFIRMATION,
                    )
                ).count(),
                "pendingApproval": queryset.filter(
                    status=RequestStatus.WAITING_FOR_APPROVAL
                ).count(),
                "remediation": queryset.filter(status__in=remediation_statuses).count(),
                "totalCost": queryset.aggregate(total=Sum("estimated_cost"))["total"] or 0,
                "byStatus": status_data,
                "byRepairType": [
                    {
                        "repairType": row["repair_type"],
                        "count": row["count"],
                        "estimatedCost": row["estimated_cost"] or 0,
                    }
                    for row in repair_type_data
                ],
                "byBuilding": [
                    {
                        "building": row["building"],
                        "count": row["count"],
                        "estimatedCost": row["estimated_cost"] or 0,
                    }
                    for row in building_data
                ],
            }
        )


class ReportExportView(ReportSummaryView):
    def get(self, request):
        queryset = self.get_queryset(request).select_related(
            "requester", "assigned_staff"
        )
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="repair-requests.csv"'
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(
            ["Mã yêu cầu", "Tiêu đề", "Tòa nhà", "Vị trí", "Trạng thái", "Hình thức", "Dự toán (VND)", "Ngày tạo"]
        )
        for obj in queryset.order_by("-created_at"):
            writer.writerow(
                [
                    safe_csv_cell(obj.code),
                    safe_csv_cell(obj.title),
                    safe_csv_cell(obj.building),
                    safe_csv_cell(obj.location),
                    safe_csv_cell(obj.status),
                    safe_csv_cell(obj.repair_type or ""),
                    obj.estimated_cost or 0,
                    timezone.localtime(obj.created_at).isoformat(),
                ]
            )
        return response


# ======================================================================
# Trợ lý AI - các API dùng chung
# ======================================================================
AI_LOG_ROLES = {Role.FACILITY_ADMIN, Role.DIRECTOR}


class AIStatusView(APIView):
    def get(self, request):
        return Response({
            "enabled": gemini.is_configured(),
            "provider": "Google Gemini" if gemini.is_configured() else "Bộ luật dự phòng",
            "models": settings.GEMINI_MODELS if gemini.is_configured() else [],
            "canViewLog": request.user.role in AI_LOG_ROLES,
        })


class AIChatView(APIView):
    def post(self, request):
        message = str(request.data.get("message", "")).strip()
        if not message:
            raise ValidationError({"message": "Vui lòng nhập câu hỏi."})
        if len(message) > 1000:
            raise ValidationError({"message": "Câu hỏi tối đa 1000 ký tự."})
        history = request.data.get("history") or []
        if not isinstance(history, list):
            history = []
        clean_history = [
            {"role": "user" if item.get("role") == "user" else "assistant", "content": str(item.get("content", ""))[:1500]}
            for item in history[-6:]
            if isinstance(item, dict)
        ]
        suggestion = generate_suggestion(
            AISuggestionKind.CHAT, request.user, message=message, history=clean_history
        )
        return Response(AISuggestionSerializer(suggestion).data, status=status.HTTP_201_CREATED)


class AITriagePreviewView(APIView):
    """Gợi ý loại sự cố & mức độ khi người dùng đang soạn yêu cầu (chưa gửi)."""

    def post(self, request):
        title = str(request.data.get("title", "")).strip()
        description = str(request.data.get("description", "")).strip()
        if len(title) + len(description) < 8:
            raise ValidationError({"description": "Vui lòng nhập tiêu đề hoặc mô tả sự cố trước khi nhờ AI gợi ý."})
        draft = {
            "title": title[:200],
            "description": description[:2000],
            "impact": str(request.data.get("impact", ""))[:500],
            "facilityCode": str(request.data.get("facilityId", ""))[:30],
            "facilityName": str(request.data.get("facilityName", ""))[:200],
            "facilityType": str(request.data.get("facilityType", ""))[:100],
            "building": str(request.data.get("building", ""))[:100],
            "location": str(request.data.get("location", ""))[:200],
            "selectedPriority": str(request.data.get("priority", ""))[:10],
        }
        draft = {key: value for key, value in draft.items() if value}
        suggestion = generate_suggestion(AISuggestionKind.TRIAGE_PREVIEW, request.user, draft=draft)
        return Response(AISuggestionSerializer(suggestion).data, status=status.HTTP_201_CREATED)


class HealthView(APIView):
    """Endpoint nhẹ để đánh thức server (Render gói miễn phí ngủ sau 15 phút không có truy cập)."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"ok": True})


class AISuggestionPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AISuggestionViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = AISuggestionSerializer
    pagination_class = AISuggestionPagination

    def get_queryset(self):
        user = self.request.user
        queryset = AISuggestion.objects.select_related("request", "created_by", "decided_by")
        if user.role not in AI_LOG_ROLES:
            queryset = queryset.filter(created_by=user)
        for param, field in (("kind", "kind"), ("status", "status"), ("source", "source")):
            value = self.request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{field: value})
        request_code = self.request.query_params.get("requestId")
        if request_code:
            queryset = queryset.filter(request__code=request_code)
        request_codes = [c.strip() for c in self.request.query_params.get("requestIds", "").split(",") if c.strip()]
        if request_codes:
            queryset = queryset.filter(request__code__in=request_codes)
        if self.request.query_params.get("latest") in ("1", "true"):
            # Chỉ giữ lần phân tích mới nhất của mỗi yêu cầu (trong phạm vi bộ lọc hiện tại).
            newest = queryset.filter(request=OuterRef("request")).order_by("-created_at", "-id").values("id")[:1]
            queryset = queryset.filter(request__isnull=False, id=Subquery(newest))
        return queryset.order_by("-created_at", "-id")

    @action(detail=True, methods=["post"])
    def dismiss(self, request, pk=None):
        suggestion = self.get_object()
        if suggestion.created_by_id != request.user.id and request.user.role not in AI_LOG_ROLES:
            raise PermissionDenied("Bạn không thể thay đổi đề xuất này.")
        if suggestion.status != AISuggestionStatus.PENDING:
            raise ValidationError({"status": "Đề xuất này đã có quyết định."})
        dismiss_suggestion(suggestion, request.user, str(request.data.get("note", "")).strip())
        return Response(self.get_serializer(suggestion).data)


class AIStatsView(APIView):
    def get(self, request):
        if request.user.role not in AI_LOG_ROLES:
            raise PermissionDenied("Chỉ Quản trị CSVC và Ban Giám hiệu xem được thống kê AI.")
        queryset = AISuggestion.objects.all()
        kinds = []
        for kind, label in AISuggestionKind.choices:
            subset = queryset.filter(kind=kind)
            counts = {row["status"]: row["n"] for row in subset.values("status").annotate(n=Count("id"))}
            decided = sum(counts.get(s, 0) for s in (AISuggestionStatus.ACCEPTED, AISuggestionStatus.MODIFIED, AISuggestionStatus.REJECTED))
            kinds.append({
                "kind": kind,
                "label": label,
                "total": subset.count(),
                "pending": counts.get(AISuggestionStatus.PENDING, 0),
                "accepted": counts.get(AISuggestionStatus.ACCEPTED, 0),
                "modified": counts.get(AISuggestionStatus.MODIFIED, 0),
                "rejected": counts.get(AISuggestionStatus.REJECTED, 0),
                "decided": decided,
                "acceptanceRate": round(counts.get(AISuggestionStatus.ACCEPTED, 0) / decided, 3) if decided else None,
                "avgLatencyMs": int(subset.aggregate(v=Avg("latency_ms"))["v"] or 0),
            })
        evaluated = queryset.exclude(kind=AISuggestionKind.CHAT)
        accepted = evaluated.filter(status=AISuggestionStatus.ACCEPTED).count()
        modified = evaluated.filter(status=AISuggestionStatus.MODIFIED).count()
        rejected = evaluated.filter(status=AISuggestionStatus.REJECTED).count()
        decided = accepted + modified + rejected
        sources = {row["source"]: row["n"] for row in queryset.values("source").annotate(n=Count("id"))}
        tool_calls = sum(len(trace or []) for trace in queryset.values_list("tool_trace", flat=True))
        return Response({
            "total": queryset.count(),
            "decided": decided,
            "accepted": accepted,
            "modified": modified,
            "rejected": rejected,
            "acceptanceRate": round(accepted / decided, 3) if decided else None,
            "agreementRate": round((accepted + modified) / decided, 3) if decided else None,
            "avgLatencyMs": int(queryset.aggregate(v=Avg("latency_ms"))["v"] or 0),
            "sources": sources,
            "toolCalls": tool_calls,
            "byKind": kinds,
            "aiEnabled": gemini.is_configured(),
        })
