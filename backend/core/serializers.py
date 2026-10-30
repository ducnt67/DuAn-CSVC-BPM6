from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.models import (
    AcceptanceRecord,
    ApprovalAction,
    ContractHandling,
    ExternalWork,
    ExternalWorkEvent,
    Facility,
    Notification,
    RepairPlan,
    RepairRequest,
    RequestAttachment,
    RequestEvent,
    RequestTimelineEvent,
    Role,
    Survey,
    User,
)


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="code", read_only=True)
    name = serializers.SerializerMethodField()
    roleTitle = serializers.CharField(source="role_title", read_only=True)
    userType = serializers.CharField(source="user_type", read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "name", "email", "role", "roleTitle", "userType",
            "department", "phone", "is_active",
        )
        read_only_fields = fields

    def get_name(self, obj):
        return obj.get_full_name() or obj.username


class UsernameOrEmailTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = str(attrs.get(self.username_field, "")).strip()
        if "@" in username:
            user = User.objects.filter(email__iexact=username, is_active=True).first()
            if user:
                attrs[self.username_field] = user.get_username()
        return super().validate(attrs)


class FacilitySerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="code")
    type = serializers.CharField(source="facility_type")
    managedBy = serializers.CharField(source="managed_by", required=False, allow_blank=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = Facility
        fields = (
            "id", "name", "type", "building", "location", "managedBy", "status",
            "description", "updatedAt",
        )


class SurveySerializer(serializers.ModelSerializer):
    surveyDate = serializers.DateTimeField(source="survey_date")
    rootCause = serializers.CharField(source="root_cause")
    damageLevel = serializers.CharField(source="damage_level")
    recommendedAction = serializers.CharField(source="recommended_action")
    estimatedTime = serializers.CharField(source="estimated_time")
    estimatedCost = serializers.DecimalField(
        source="estimated_cost", max_digits=14, decimal_places=2, allow_null=True
    )
    surveyorName = serializers.SerializerMethodField()
    completedAt = serializers.DateTimeField(source="completed_at", read_only=True)

    class Meta:
        model = Survey
        fields = (
            "surveyDate", "findings", "rootCause", "damageLevel", "recommendedAction",
            "estimatedTime", "estimatedCost", "notes", "surveyorName", "completedAt",
        )
        read_only_fields = ("surveyorName", "completedAt")

    def get_surveyorName(self, obj):
        return obj.surveyor.get_full_name() or obj.surveyor.username


class RequestEventSerializer(serializers.ModelSerializer):
    performedBy = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)
    note = serializers.CharField(source="detail", read_only=True)

    class Meta:
        model = RequestEvent
        fields = ("action", "performedBy", "timestamp", "note")

    def get_performedBy(self, obj):
        return (obj.actor.get_full_name() or obj.actor.username) if obj.actor else "Hệ thống"


class TimelineSerializer(serializers.ModelSerializer):
    updatedAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedBy = serializers.SerializerMethodField()

    class Meta:
        model = RequestTimelineEvent
        fields = ("stage", "status", "updatedAt", "updatedBy", "note")

    def get_updatedBy(self, obj):
        return (obj.actor.get_full_name() or obj.actor.username) if obj.actor else "Hệ thống"


class AcceptanceRecordSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="code", read_only=True)
    inspectionDate = serializers.DateField(source="inspection_date")
    inspectorName = serializers.SerializerMethodField()
    inspectorId = serializers.CharField(source="inspector.code", read_only=True)
    checkItems = serializers.CharField(source="check_items")
    remediationNotes = serializers.CharField(source="remediation_notes")
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = AcceptanceRecord
        fields = (
            "id", "inspectionDate", "inspectorName", "inspectorId", "checkItems",
            "result", "notes", "remediationNotes", "timestamp",
        )
        read_only_fields = ("id", "inspectorName", "inspectorId", "timestamp")

    def get_inspectorName(self, obj):
        return obj.inspector.get_full_name() or obj.inspector.username


class ApprovalActionSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(source="created_at", read_only=True)
    actorName = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalAction
        fields = ("date", "action", "actorName", "comments")

    def get_actorName(self, obj):
        return obj.actor.get_full_name() or obj.actor.username


class RepairPlanSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="code", read_only=True)
    requestId = serializers.CharField(source="request.code", read_only=True)
    repairType = serializers.CharField(source="repair_type")
    estimatedCost = serializers.DecimalField(source="estimated_cost", max_digits=14, decimal_places=2)
    estimatedTime = serializers.CharField(source="estimated_duration")
    createdBy = serializers.CharField(source="proposed_by.code", read_only=True)
    createdByName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="proposed_at", read_only=True)
    needsApproval = serializers.BooleanField(source="requires_approval")
    approvalStatus = serializers.CharField(source="approval_status", read_only=True)
    approvedBy = serializers.CharField(source="approved_by.code", read_only=True, allow_null=True)
    approvedByName = serializers.SerializerMethodField()
    approvedAt = serializers.DateTimeField(source="approved_at", read_only=True)
    rejectedBy = serializers.CharField(source="rejected_by.code", read_only=True, allow_null=True)
    rejectionReason = serializers.CharField(source="rejection_reason", read_only=True)
    approvalHistory = ApprovalActionSerializer(
        source="approval_history", many=True, read_only=True
    )

    class Meta:
        model = RepairPlan
        fields = (
            "id", "requestId", "title", "repairType", "description", "materials",
            "estimatedCost", "estimatedTime", "createdBy", "createdByName", "createdAt",
            "needsApproval", "approvalStatus", "approvedBy", "approvedByName", "approvedAt",
            "rejectedBy", "rejectionReason", "approvalHistory",
        )
        read_only_fields = fields

    def get_createdByName(self, obj):
        return obj.proposed_by.get_full_name() or obj.proposed_by.username

    def get_approvedByName(self, obj):
        if not obj.approved_by:
            return None
        return obj.approved_by.get_full_name() or obj.approved_by.username


class ExternalWorkEventSerializer(serializers.ModelSerializer):
    date = serializers.DateTimeField(source="created_at", read_only=True)
    actorName = serializers.SerializerMethodField()

    class Meta:
        model = ExternalWorkEvent
        fields = ("date", "action", "actorName", "detail")

    def get_actorName(self, obj):
        return (obj.actor.get_full_name() or obj.actor.username) if obj.actor else "Hệ thống"


class ExternalWorkSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="code", read_only=True)
    requestId = serializers.CharField(source="request.code", read_only=True)
    planId = serializers.CharField(source="plan.code", read_only=True, allow_null=True)
    contractorPhone = serializers.CharField(source="contractor_contact", read_only=True)
    contractorContact = serializers.CharField(source="contractor_contact", read_only=True)
    startDate = serializers.DateField(source="start_date", allow_null=True, required=False)
    expectedEndDate = serializers.DateField(source="expected_end_date", allow_null=True, required=False)
    actualEndDate = serializers.DateField(source="actual_end_date", read_only=True, allow_null=True)
    workResult = serializers.CharField(source="work_result", allow_blank=True, required=False)
    workNotes = serializers.CharField(source="work_notes", allow_blank=True, required=False)
    remediationContent = serializers.CharField(source="remediation_content", read_only=True)
    remediationDeadline = serializers.DateTimeField(source="remediation_deadline", read_only=True)
    remediationRequestedAt = serializers.DateTimeField(source="remediation_requested_at", read_only=True)
    workCompletedAt = serializers.DateTimeField(source="work_completed_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    history = ExternalWorkEventSerializer(many=True, read_only=True)

    class Meta:
        model = ExternalWork
        fields = (
            "id", "requestId", "planId", "title", "contractor", "contractorPhone",
            "contractorContact",
            "startDate", "expectedEndDate", "actualEndDate", "progress", "status",
            "workResult", "workNotes", "remediationContent", "remediationDeadline",
            "remediationRequestedAt", "workCompletedAt", "createdAt", "updatedAt", "history",
        )
        read_only_fields = (
            "id", "requestId", "planId", "actualEndDate", "remediationContent",
            "remediationDeadline", "remediationRequestedAt", "workCompletedAt",
            "createdAt", "updatedAt", "history",
        )


class RequestSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="code", read_only=True)
    facilityId = serializers.CharField(source="facility_code", allow_blank=True, required=False)
    facilityName = serializers.CharField(source="facility_name", allow_blank=True, required=False)
    facilityType = serializers.CharField(source="facility_type", allow_blank=True, required=False)
    requesterId = serializers.CharField(source="requester.code", read_only=True)
    requesterName = serializers.CharField(source="requester_name", required=False, allow_blank=True)
    requesterType = serializers.CharField(source="requester_type", allow_blank=True, required=False)
    contactInfo = serializers.CharField(source="contact_info", allow_blank=True, required=False)
    discoveredAt = serializers.DateTimeField(source="discovered_at", allow_null=True, required=False)
    repairType = serializers.CharField(source="repair_type", allow_null=True, required=False)
    assignedStaffId = serializers.CharField(source="assigned_staff.code", read_only=True, allow_null=True)
    assignedStaffName = serializers.SerializerMethodField()
    assignedAt = serializers.DateTimeField(source="assigned_at", read_only=True)
    needsApproval = serializers.BooleanField(source="needs_approval", read_only=True)
    estimatedCost = serializers.DecimalField(
        source="estimated_cost", max_digits=14, decimal_places=2, allow_null=True, read_only=True
    )
    internalRepairResult = serializers.JSONField(source="internal_repair_result", read_only=True)
    completedAt = serializers.DateTimeField(source="completed_at", read_only=True)
    completedBy = serializers.CharField(source="completed_by.code", read_only=True, allow_null=True)
    acceptanceResult = serializers.CharField(source="acceptance_result", read_only=True)
    remediationNotes = serializers.CharField(source="remediation_notes", read_only=True)
    remediationRequestedAt = serializers.DateTimeField(source="remediation_requested_at", read_only=True)
    remediationDeadline = serializers.DateTimeField(source="remediation_deadline", read_only=True)
    remediationHours = serializers.IntegerField(source="remediation_hours", read_only=True)
    remediationResponseReceived = serializers.BooleanField(source="remediation_response_received", read_only=True)
    remediationResponseDate = serializers.DateField(source="remediation_response_date", read_only=True)
    remediationResponseNote = serializers.CharField(source="remediation_response_note", read_only=True)
    remediationStatus = serializers.CharField(source="remediation_status", read_only=True)
    externalProgress = serializers.IntegerField(source="external_progress", read_only=True)
    rejectionReason = serializers.CharField(source="rejection_reason", read_only=True)
    contractHandling = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    survey = SurveySerializer(read_only=True)
    surveyData = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    history = RequestEventSerializer(many=True, read_only=True)
    timeline = TimelineSerializer(many=True, read_only=True)
    acceptanceRecords = AcceptanceRecordSerializer(
        source="acceptance_records", many=True, read_only=True
    )
    acceptanceHistory = serializers.SerializerMethodField()
    repairPlans = RepairPlanSerializer(source="repair_plans", many=True, read_only=True)
    externalWorks = ExternalWorkSerializer(source="external_works", many=True, read_only=True)
    contractor = serializers.CharField(read_only=True)
    approvalStatus = serializers.SerializerMethodField()
    approvedBy = serializers.SerializerMethodField()
    approvedByName = serializers.SerializerMethodField()
    approvedAt = serializers.SerializerMethodField()

    class Meta:
        model = RepairRequest
        fields = (
            "id", "title", "facilityId", "facilityName", "facilityType", "building", "location",
            "requesterId", "requesterName", "requesterType", "department", "contactInfo",
            "description", "impact", "discoveredAt", "createdAt", "updatedAt", "priority",
            "status", "repairType", "assignedStaffId", "assignedStaffName", "assignedAt",
            "needsApproval", "estimatedCost", "internalRepairResult", "completedAt", "completedBy",
            "acceptanceResult", "remediationNotes", "remediationRequestedAt", "remediationDeadline",
            "remediationHours", "remediationResponseReceived", "remediationResponseDate",
            "remediationResponseNote", "remediationStatus", "externalProgress", "rejectionReason",
            "contractHandling", "survey", "surveyData", "attachments", "history", "timeline",
            "acceptanceRecords", "acceptanceHistory", "repairPlans", "externalWorks", "contractor",
            "approvalStatus", "approvedBy", "approvedAt",
            "approvedByName",
        )
        read_only_fields = (
            "id", "requesterId", "requesterName", "createdAt", "updatedAt", "assignedStaffId",
            "assignedStaffName", "assignedAt", "needsApproval", "estimatedCost",
            "internalRepairResult", "completedAt", "completedBy", "acceptanceResult",
            "remediationNotes", "remediationRequestedAt", "remediationDeadline", "remediationHours",
            "remediationResponseReceived", "remediationResponseDate", "remediationResponseNote",
            "remediationStatus", "externalProgress", "rejectionReason", "contractHandling",
            "survey", "surveyData", "history", "timeline", "acceptanceRecords",
            "acceptanceHistory", "repairPlans", "externalWorks", "contractor",
            "approvalStatus", "approvedBy", "approvedAt", "status", "repairType",
            "assignedStaffId", "assignedStaffName", "requesterId", "approvedByName",
        )

    def get_assignedStaffName(self, obj):
        if not obj.assigned_staff:
            return None
        return obj.assigned_staff.get_full_name() or obj.assigned_staff.username

    def get_surveyData(self, obj):
        try:
            return SurveySerializer(obj.survey).data
        except Survey.DoesNotExist:
            return None

    def get_attachments(self, obj):
        return list(obj.attachments.values_list("file_name", flat=True))

    def get_acceptanceHistory(self, obj):
        return AcceptanceRecordSerializer(obj.acceptance_records.all(), many=True).data

    def get_approvalStatus(self, obj):
        plan = obj.repair_plans.first()
        return plan.approval_status if plan else None

    def get_approvedBy(self, obj):
        plan = obj.repair_plans.first()
        return plan.approved_by.code if plan and plan.approved_by else None

    def get_approvedByName(self, obj):
        plan = obj.repair_plans.first()
        if not plan or not plan.approved_by:
            return None
        return plan.approved_by.get_full_name() or plan.approved_by.username

    def get_approvedAt(self, obj):
        plan = obj.repair_plans.first()
        return plan.approved_at if plan else None

    def get_contractHandling(self, obj):
        handling = (
            ContractHandling.objects.select_related("processed_by")
            .filter(request_id=obj.pk)
            .first()
        )
        if handling is None:
            return None
        return {
            "actions": handling.actions,
            "violationClause": handling.violation_clause,
            "overdueNote": handling.overdue_note,
            "penaltyAmount": str(handling.penalty_amount) if handling.penalty_amount is not None else None,
            "deductionAmount": str(handling.deduction_amount) if handling.deduction_amount is not None else None,
            "paymentSuspensionUntil": handling.payment_suspension_until,
            "contractExtensionUntil": handling.contract_extension_until,
            "terminationReason": handling.termination_reason,
            "contractNotes": handling.contract_notes,
            "processedAt": handling.processed_at,
            "processedBy": handling.processed_by.get_full_name() or handling.processed_by.username,
            "status": handling.status,
        }

    def validate_priority(self, value):
        if value not in {"LOW", "MEDIUM", "HIGH", "URGENT"}:
            raise serializers.ValidationError("Mức độ ưu tiên không hợp lệ.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        attachment_names = self.initial_data.get("attachments", [])
        if not isinstance(attachment_names, list) or not all(
            isinstance(name, str) and name.strip() for name in attachment_names
        ):
            raise serializers.ValidationError({"attachments": "Danh sách tên tệp không hợp lệ."})
        facility_code = validated_data.get("facility_code", "")
        facility = Facility.objects.filter(code=facility_code).first() if facility_code else None
        obj = RepairRequest.objects.create(
            requester=request.user,
            requester_name=(
                validated_data.pop("requester_name", "")
                or request.user.get_full_name()
                or request.user.username
            ),
            facility=facility,
            **validated_data,
        )
        RequestAttachment.objects.bulk_create(
            [RequestAttachment(request=obj, file_name=name.strip()) for name in attachment_names]
        )
        return obj


class NotificationSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    targetId = serializers.CharField(source="request.code", read_only=True, allow_null=True)
    targetRole = serializers.CharField(source="target_role", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    read = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ("id", "title", "message", "type", "targetRole", "targetId", "createdAt", "read")

    def get_id(self, obj):
        return str(obj.pk)

    def get_read(self, obj):
        return obj.read_at is not None
