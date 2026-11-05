from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from core.models import (
    AcceptanceRecord,
    ApprovalAction,
    BusinessSequence,
    ExternalWork,
    ExternalWorkEvent,
    ExternalWorkStatus,
    Facility,
    FacilityStatus,
    Notification,
    RepairPlan,
    RepairPlanStatus,
    RepairRequest,
    RepairType,
    RequestStatus,
    Role,
    Survey,
    User,
)
from core.management.commands._history_data import DEMO_CASES, EXTRA_STAFF, HISTORY
from core.models import RequestEvent
from core.services import record_request_event


USERS = [
    ("U01", "nmanh", "Nguyễn", "Minh Anh", "REQUESTER", "Giảng viên", "LECTURER", "Khoa Quản trị Kinh doanh", "nmanh@due.edu.vn", "0901234567"),
    ("U02", "tqhuy", "Trần", "Quốc Huy", "FACILITY_ADMIN", "Quản trị CSVC", "LECTURER", "Phòng Quản trị Cơ sở vật chất", "tqhuy@due.edu.vn", "0902345678"),
    ("U03", "lhnam", "Lê", "Hoàng Nam", "STAFF", "Cán bộ phụ trách", "LECTURER", "Tổ Kỹ thuật tổng hợp - Phòng Quản trị CSVC", "lhnam@due.edu.vn", "0903456789"),
    ("U04", "nttha", "Nguyễn", "Thị Thu Hà", "DIRECTOR", "Ban Giám hiệu", "LECTURER", "Ban Giám hiệu Trường", "nttha@due.edu.vn", "0904567890"),
    ("U05", "pvbinh", "Phạm", "Văn Bình", "PROCUREMENT", "BP Đầu tư & Mua sắm", "LECTURER", "Bộ phận Đầu tư, Mua sắm & Xây dựng", "pvbinh@due.edu.vn", "0905678901"),
    ("U06", "sv_hoang", "Trần", "Minh Hoàng", "REQUESTER", "Sinh viên", "STUDENT", "Lớp 47K01.1 - Khoa QTKD", "hoang.tm@due.edu.vn", "0912345678"),
    *EXTRA_STAFF,
]

FACILITIES = [
    ("CSVC-001", "Phòng học C101", "Phòng học", "Khu C", "Tầng 1, Phòng 101", "Phòng Quản trị"),
    ("CSVC-002", "Phòng học C202", "Phòng học", "Khu C", "Tầng 2, Phòng 202", "Phòng Quản trị"),
    ("CSVC-003", "Phòng máy tính E301", "Phòng máy tính", "Khu E", "Tầng 3, Phòng 301", "Trung tâm CNTT"),
    ("CSVC-004", "Phòng làm việc F102", "Phòng làm việc", "Khu F", "Tầng 1, Phòng 102", "Phòng Quản trị"),
    ("CSVC-005", "Hệ thống đèn chiếu sáng tầng 2 - Khu C", "Thiết bị điện", "Khu C", "Tầng 2, hành lang", "Phòng Quản trị"),
    ("CSVC-006", "Máy điều hòa phòng C101", "Thiết bị điện", "Khu C", "Tầng 1, Phòng 101", "Phòng Quản trị"),
    ("CSVC-007", "Máy chiếu phòng D201", "Thiết bị CNTT", "Khu D", "Tầng 2, Phòng 201", "Trung tâm CNTT"),
    ("CSVC-008", "Hệ thống cấp thoát nước tầng 1 - Khu A", "Hệ thống nước", "Khu A", "Tầng 1, khu vệ sinh", "Phòng Quản trị"),
    ("CSVC-009", "Cửa phòng học A302", "Hạ tầng", "Khu A", "Tầng 3, Phòng 302", "Phòng Quản trị"),
    ("CSVC-010", "Bàn ghế phòng học E201", "Nội thất", "Khu E", "Tầng 2, Phòng 201", "Phòng Quản trị"),
    ("CSVC-011", "Hệ thống mạng nội bộ Khu E", "Hệ thống mạng", "Khu E", "Tầng 1-4", "Trung tâm CNTT"),
    ("CSVC-012", "Ổ cắm điện phòng D301", "Thiết bị điện", "Khu D", "Tầng 3, Phòng 301", "Phòng Quản trị"),
]

SAMPLE_REQUESTS = [
    {
        "code": "YC-9001",
        "facility": "CSVC-006",
        "status": RequestStatus.NEW,
        "priority": "HIGH",
        "title": "Điều hòa phòng C101 không hoạt động",
        "description": "Máy điều hòa bật không chạy, ảnh hưởng đến việc giảng dạy.",
        "location": "Tầng 1, Phòng 101",
    },
    {
        "code": "YC-9002",
        "facility": "CSVC-005",
        "status": RequestStatus.SURVEYING,
        "priority": "MEDIUM",
        "title": "Đèn hành lang tầng 2 bị chập chờn",
        "description": "Một số đèn hành lang không sáng, cần khảo sát hiện trạng.",
        "location": "Tầng 2, hành lang",
        "assigned": True,
    },
    {
        "code": "YC-9003",
        "facility": "CSVC-008",
        "status": RequestStatus.WAITING_FOR_PLAN,
        "priority": "HIGH",
        "title": "Vòi nước khu vệ sinh bị rò rỉ",
        "description": "Vòi lavabo chảy liên tục dù đã khóa.",
        "location": "Tầng 1, khu vệ sinh",
        "assigned": True,
        "survey": {
            "findings": "Van vòi bị mòn, gioăng cao su lão hóa.",
            "root_cause": "Hao mòn tự nhiên do sử dụng lâu ngày.",
            "damage_level": "Trung bình",
            "recommended_action": "Thay van vòi và gioăng cao su.",
            "estimated_time": "2 giờ",
            "estimated_cost": 200000,
        },
    },
    {
        "code": "YC-9004",
        "facility": "CSVC-010",
        "status": RequestStatus.WAITING_FOR_APPROVAL,
        "priority": "HIGH",
        "title": "Bàn ghế phòng học cần thay mới",
        "description": "Nhiều bộ bàn ghế hư hỏng, không bảo đảm chỗ ngồi.",
        "location": "Tầng 2, Phòng 201",
        "assigned": True,
        "survey": {
            "findings": "Một số bộ bàn ghế gãy chân, mặt bàn hỏng.",
            "root_cause": "Hao mòn trong quá trình sử dụng.",
            "damage_level": "Nặng",
            "recommended_action": "Thay mới các bộ bàn ghế hư hỏng.",
            "estimated_time": "15 ngày",
            "estimated_cost": 12000000,
        },
        "plan": {
            "code": "PA-9004",
            "title": "Mua mới và lắp đặt bàn ghế",
            "repair_type": RepairType.EXTERNAL,
            "cost": 12000000,
            "requires_approval": True,
            "approval_status": RepairPlanStatus.PENDING,
        },
    },
    {
        "code": "YC-9005",
        "facility": "CSVC-007",
        "status": RequestStatus.EXTERNAL_WORK_IN_PROGRESS,
        "priority": "MEDIUM",
        "title": "Máy chiếu phòng D201 cần sửa chữa",
        "description": "Máy chiếu không lên hình, cần kiểm tra bộ nguồn.",
        "location": "Tầng 2, Phòng 201",
        "assigned": True,
        "survey": {
            "findings": "Bộ nguồn máy chiếu hoạt động không ổn định.",
            "root_cause": "Linh kiện nguồn bị xuống cấp.",
            "damage_level": "Trung bình",
            "recommended_action": "Gửi trung tâm bảo hành kiểm tra và sửa chữa.",
            "estimated_time": "10 ngày",
            "estimated_cost": 4500000,
        },
        "plan": {
            "code": "PA-9005",
            "title": "Sửa chữa bộ nguồn máy chiếu",
            "repair_type": RepairType.EXTERNAL,
            "cost": 4500000,
            "requires_approval": True,
            "approval_status": RepairPlanStatus.APPROVED,
        },
        "work": {
            "code": "TN-9005",
            "contractor": "Trung tâm bảo hành thiết bị",
            "progress": 60,
            "status": ExternalWorkStatus.IN_PROGRESS,
            "notes": "Đang kiểm tra và chờ linh kiện thay thế.",
        },
    },
    {
        "code": "YC-9006",
        "facility": "CSVC-009",
        "status": RequestStatus.WAITING_FOR_ACCEPTANCE,
        "priority": "MEDIUM",
        "title": "Cửa phòng học cần chỉnh bản lề và ổ khóa",
        "description": "Cửa đóng mở khó khăn, ổ khóa bị lệch.",
        "location": "Tầng 3, Phòng 302",
        "assigned": True,
        "acceptance_result": "PASS",
        "survey": {
            "findings": "Bản lề cửa bị cong, ổ khóa bị lệch.",
            "root_cause": "Va đập và hao mòn.",
            "damage_level": "Trung bình",
            "recommended_action": "Thay bản lề và chỉnh ổ khóa.",
            "estimated_time": "3 ngày",
            "estimated_cost": 1200000,
        },
        "plan": {
            "code": "PA-9006",
            "title": "Thay bản lề và chỉnh ổ khóa",
            "repair_type": RepairType.EXTERNAL,
            "cost": 1200000,
            "requires_approval": True,
            "approval_status": RepairPlanStatus.APPROVED,
        },
        "work": {
            "code": "TN-9006",
            "contractor": "Cơ sở sửa chữa Hoàng Long",
            "progress": 100,
            "status": ExternalWorkStatus.WAITING_ACCEPTANCE,
            "work_result": "Đã thay bản lề và căn chỉnh ổ khóa.",
        },
        "acceptance": {
            "code": "NT-9006",
            "result": "PASS",
            "check_items": "Kiểm tra đóng mở cửa và hoạt động ổ khóa.",
            "notes": "Cửa đóng mở bình thường.",
        },
    },
    {
        "code": "YC-9007",
        "facility": "CSVC-011",
        "status": RequestStatus.WAITING_REMEDIATION_RESPONSE,
        "priority": "HIGH",
        "title": "Hệ thống mạng cần khắc phục sau nghiệm thu",
        "description": "Một số điểm mạng chưa đạt tốc độ yêu cầu.",
        "location": "Tầng 3, Phòng B303",
        "assigned": True,
        "acceptance_result": "FAIL",
        "remediation_notes": "Kiểm tra lại đấu nối và cấu hình switch.",
        "survey": {
            "findings": "Switch hoạt động không ổn định, một số cáp mạng hỏng.",
            "root_cause": "Thiết bị cũ và cáp xuống cấp.",
            "damage_level": "Nặng",
            "recommended_action": "Thay switch và đi lại cáp mạng.",
            "estimated_time": "5 ngày",
            "estimated_cost": 7800000,
        },
        "plan": {
            "code": "PA-9007",
            "title": "Thay switch và đi lại cáp mạng",
            "repair_type": RepairType.EXTERNAL,
            "cost": 7800000,
            "requires_approval": True,
            "approval_status": RepairPlanStatus.APPROVED,
        },
        "work": {
            "code": "TN-9007",
            "contractor": "Công ty Hạ tầng mạng miền Trung",
            "progress": 100,
            "status": ExternalWorkStatus.NEEDS_REMEDIATION,
            "work_result": "Đã thay switch và đi lại cáp mạng.",
            "remediation_content": "Kiểm tra lại đấu nối và cấu hình switch.",
        },
        "acceptance": {
            "code": "NT-9007",
            "result": "FAIL",
            "check_items": "Đo tốc độ mạng và kiểm tra kết nối các điểm.",
            "notes": "Một số điểm mạng chưa đạt yêu cầu.",
        },
    },
    {
        "code": "YC-9008",
        "facility": "CSVC-012",
        "status": RequestStatus.COMPLETED,
        "priority": "URGENT",
        "title": "Ổ cắm điện phòng D301 đã được thay thế",
        "description": "Ổ cắm có dấu hiệu cháy, đã được xử lý nội bộ.",
        "location": "Tầng 3, Phòng 301",
        "assigned": True,
        "repair_type": RepairType.INTERNAL,
        "cost": 350000,
        "completed": True,
        "internal_result": {
            "workDone": "Đã thay ổ cắm và kiểm tra dây dẫn.",
            "partsReplaced": "Ổ cắm điện mới",
            "testNotes": "Đã kiểm tra, sử dụng an toàn.",
            "technician": "Lê Hoàng Nam",
        },
        "survey": {
            "findings": "Ổ cắm bị chập, vỏ nhựa biến dạng do nhiệt.",
            "root_cause": "Quá tải điện.",
            "damage_level": "Nặng",
            "recommended_action": "Thay ổ cắm và kiểm tra dây dẫn.",
            "estimated_time": "4 giờ",
            "estimated_cost": 350000,
        },
        "plan": {
            "code": "PA-9008",
            "title": "Thay ổ cắm và kiểm tra dây điện",
            "repair_type": RepairType.INTERNAL,
            "cost": 350000,
            "requires_approval": False,
            "approval_status": RepairPlanStatus.APPROVED,
        },
    },
]


class Command(BaseCommand):
    help = "Tạo tài khoản, danh mục và dữ liệu mẫu các luồng sửa chữa CSVC."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default="123",
            help="Mật khẩu local demo dùng chung; mặc định 123. Đổi trước khi triển khai.",
        )
        parser.add_argument(
            "--reset-ai-demo",
            action="store_true",
            help="Xóa nhật ký AI và tạo lại các tình huống demo Trợ lý AI (YC-8101..YC-8105) về trạng thái ban đầu.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
        if options.get("reset_ai_demo"):
            from core.models import AISuggestion

            demo_codes = [case["code"] for case in DEMO_CASES]
            AISuggestion.objects.all().delete()
            RepairRequest.objects.filter(code__in=demo_codes).delete()
            RepairRequest.objects.filter(code="YC-9005").update(acceptance_inspector=None, inspector_assigned_at=None)
            self.stdout.write("Đã xóa nhật ký AI và các tình huống demo AI; đang tạo lại...")
        if not password.strip():
            raise CommandError("Mật khẩu demo không được để trống.")
        users = {}
        for code, username, first, last, role, role_title, user_type, department, email, phone in USERS:
            user, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "code": code,
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "role_title": role_title,
                    "user_type": user_type,
                    "department": department,
                    "email": email,
                    "phone": phone,
                    "is_active": True,
                },
            )
            user.set_password(password)
            user.save(update_fields=["password"])
            users[code] = user
        facilities = {}
        for code, name, facility_type, building, location, managed_by in FACILITIES:
            facility, _ = Facility.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "facility_type": facility_type,
                    "building": building,
                    "location": location,
                    "managed_by": managed_by,
                    "status": FacilityStatus.ACTIVE,
                },
            )
            facilities[code] = facility

        now = timezone.now()
        created_count = 0
        for sample in SAMPLE_REQUESTS:
            facility = facilities[sample["facility"]]
            requester = users["U06"] if sample["code"] == "YC-9008" else users["U01"]
            values = {
                "title": sample["title"],
                "facility": facility,
                "facility_code": facility.code,
                "facility_name": facility.name,
                "facility_type": facility.facility_type,
                "building": facility.building,
                "location": sample["location"],
                "requester": requester,
                "requester_name": requester.get_full_name(),
                "requester_type": requester.user_type,
                "department": requester.department,
                "contact_info": requester.phone,
                "description": sample["description"],
                "priority": sample["priority"],
                "status": sample["status"],
                "repair_type": sample.get("repair_type")
                or (sample.get("plan") or {}).get("repair_type"),
                "assigned_staff": users["U03"] if sample.get("assigned") else None,
                "assigned_at": now - timedelta(days=2) if sample.get("assigned") else None,
                "needs_approval": sample.get("plan", {}).get("requires_approval", False),
                "estimated_cost": sample.get("cost"),
                "internal_repair_result": sample.get("internal_result", {}),
                "completed_at":                 now - timedelta(hours=3) if sample.get("completed") else None,
                "completed_by": requester if sample.get("completed") else None,
                "acceptance_result": sample.get("acceptance_result", ""),
                "remediation_notes": sample.get("remediation_notes", ""),
                "remediation_requested_at": (
                    now - timedelta(hours=4) if sample.get("remediation_notes") else None
                ),
                "remediation_deadline": (
                    now + timedelta(hours=68) if sample.get("remediation_notes") else None
                ),
                "remediation_hours": 72,
                "remediation_status": "WAITING" if sample.get("remediation_notes") else "",
                "external_progress": sample.get("work", {}).get("progress", 0),
                "contractor": sample.get("work", {}).get("contractor", ""),
            }
            obj, created = RepairRequest.objects.get_or_create(
                code=sample["code"], defaults=values
            )
            if not created:
                continue
            created_count += 1
            if sample.get("survey"):
                Survey.objects.create(
                    request=obj,
                    survey_date=now - timedelta(days=1),
                    surveyor=users["U03"],
                    **sample["survey"],
                )
            plan = None
            if sample.get("plan"):
                plan_values = sample["plan"]
                plan, _ = RepairPlan.objects.get_or_create(
                    code=plan_values["code"],
                    defaults={
                        "request": obj,
                        "title": plan_values["title"],
                        "repair_type": plan_values["repair_type"],
                        "estimated_cost": plan_values["cost"],
                        "estimated_duration": "5 ngày",
                        "description": plan_values["title"],
                        "proposed_by": users["U03"],
                        "requires_approval": plan_values["requires_approval"],
                        "approval_status": plan_values["approval_status"],
                        "approved_by": (
                            users["U04"]
                            if plan_values["approval_status"] == RepairPlanStatus.APPROVED
                            and plan_values["requires_approval"]
                            else None
                        ),
                        "approved_at": (
                            now - timedelta(hours=12)
                            if plan_values["approval_status"] == RepairPlanStatus.APPROVED
                            else None
                        ),
                    },
                )
                ApprovalAction.objects.get_or_create(
                    plan=plan,
                    action="SUBMITTED",
                    defaults={
                        "actor": users["U03"],
                        "comments": "Gửi phê duyệt" if plan_values["requires_approval"] else "Phương án nội bộ",
                    },
                )
                if plan_values["approval_status"] == RepairPlanStatus.APPROVED:
                    ApprovalAction.objects.get_or_create(
                        plan=plan,
                        action="APPROVED" if plan_values["requires_approval"] else "AUTO_APPROVED",
                        defaults={
                            "actor": users["U04"] if plan_values["requires_approval"] else users["U03"],
                            "comments": "Đồng ý phương án." if plan_values["requires_approval"] else "Tự động duyệt phương án nội bộ.",
                        },
                    )
            if sample.get("work"):
                work_values = sample["work"]
                work, _ = ExternalWork.objects.get_or_create(
                    code=work_values["code"],
                    defaults={
                        "request": obj,
                        "plan": plan,
                        "title": plan.title if plan else obj.title,
                        "contractor": work_values.get("contractor", ""),
                        "progress": work_values.get("progress", 0),
                        "status": work_values["status"],
                        "work_result": work_values.get("work_result", ""),
                        "work_notes": work_values.get("notes", ""),
                        "remediation_content": work_values.get("remediation_content", ""),
                        "remediation_requested_at": obj.remediation_requested_at,
                        "remediation_deadline": obj.remediation_deadline,
                    },
                )
                ExternalWorkEvent.objects.get_or_create(
                    work=work,
                    action="Tiếp nhận công việc",
                    defaults={"actor": users["U05"], "detail": "Đã tiếp nhận hồ sơ thuê ngoài."},
                )
                if work.progress:
                    ExternalWorkEvent.objects.get_or_create(
                        work=work,
                        action="Cập nhật tiến độ",
                        defaults={
                            "actor": users["U05"],
                            "detail": f"Tiến độ công việc: {work.progress}%.",
                        },
                    )
            if sample.get("acceptance"):
                acceptance = sample["acceptance"]
                AcceptanceRecord.objects.get_or_create(
                    code=acceptance["code"],
                    defaults={
                        "request": obj,
                        "inspection_date": timezone.localdate() - timedelta(days=1),
                        "inspector": users["U03"],
                        "check_items": acceptance["check_items"],
                        "result": acceptance["result"],
                        "notes": acceptance["notes"],
                        "remediation_notes": sample.get("remediation_notes", ""),
                    },
                )
            record_request_event(
                obj,
                requester,
                "Tạo yêu cầu",
                "Yêu cầu mẫu được tạo bằng lệnh seed_demo.",
                timeline_stage="Gửi yêu cầu",
            )
            if sample.get("assigned"):
                record_request_event(
                    obj,
                    users["U02"],
                    "Phân công cán bộ phụ trách",
                    "Đã phân công cho Lê Hoàng Nam.",
                    timeline_stage="Phân công cán bộ",
                )
            if sample["status"] == RequestStatus.WAITING_FOR_APPROVAL:
                Notification.objects.get_or_create(
                    request=obj,
                    target_role=Role.DIRECTOR,
                    title="Phương án chờ phê duyệt",
                    defaults={"message": f"{obj.code}: {obj.title}", "type": "info"},
                )
            if sample.get("remediation_notes"):
                Notification.objects.get_or_create(
                    request=obj,
                    target_role=Role.PROCUREMENT,
                    title="Yêu cầu khắc phục sau nghiệm thu",
                    defaults={
                        "message": f"{obj.code}: {obj.remediation_notes}",
                        "type": "warning",
                    },
                )

        history_count = self._seed_history(users, facilities, now)
        demo_count = self._seed_demo_cases(users, facilities, now)
        self._sync_sequences()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete: {len(users)} users, {len(facilities)} facilities, "
                f"{created_count} new sample requests, {history_count} new history requests, "
                f"{demo_count} new AI demo requests."
            )
        )

    # ------------------------------------------------------------------
    # Lịch sử 6 tháng: để Trợ lý AI có dữ liệu so sánh chi phí, kinh nghiệm cán bộ, nhà thầu.
    # ------------------------------------------------------------------
    def _base_values(self, facility, requester, title, description, location=None):
        return {
            "title": title,
            "facility": facility,
            "facility_code": facility.code,
            "facility_name": facility.name,
            "facility_type": facility.facility_type,
            "building": facility.building,
            "location": location or facility.location,
            "requester": requester,
            "requester_name": requester.get_full_name(),
            "requester_type": requester.user_type,
            "department": requester.department,
            "contact_info": requester.phone,
            "description": description,
        }

    def _seed_history(self, users, facilities, now):
        created_count = 0
        for index, row in enumerate(HISTORY, start=1):
            (facility_code, category, title, description, repair_type, cost, duration,
             staff_code, contractor, priority, flag) = row
            code = f"YC-{8000 + index}"
            if RepairRequest.objects.filter(code=code).exists():
                continue
            facility = facilities[facility_code]
            requester = users["U06"] if index % 3 == 0 else users["U01"]
            staff = users[staff_code]
            created_at = now - timedelta(days=round(178 - index * 4.6, 1))
            completed_at = created_at + timedelta(days=duration + 1)
            external = repair_type == RepairType.EXTERNAL
            inspector = None
            if external and staff_code != "U03" and index % 2 == 0:
                inspector = users["U03"]
            inspector_user = inspector or staff
            obj = RepairRequest.objects.create(
                code=code,
                **self._base_values(facility, requester, title, description),
                priority=priority,
                status=RequestStatus.COMPLETED,
                repair_type=repair_type,
                issue_category=category,
                assigned_staff=staff,
                assigned_at=created_at + timedelta(hours=3),
                acceptance_inspector=inspector,
                needs_approval=external or cost >= 3000000,
                estimated_cost=cost,
                completed_at=completed_at,
                completed_by=inspector_user if external else requester,
                acceptance_result="PASS" if external else "",
                contractor=contractor,
                external_progress=100 if external else 0,
                internal_repair_result={} if external else {
                    "workDone": f"Đã xử lý: {title.lower()}.",
                    "technician": staff.get_full_name(),
                },
            )
            survey_cost = int(round(cost * (1.05 if index % 2 else 0.95), -4))
            Survey.objects.create(
                request=obj,
                survey_date=created_at + timedelta(hours=6),
                findings=description,
                root_cause="Hao mòn trong quá trình sử dụng.",
                damage_level="Nặng" if priority in ("HIGH", "URGENT") else "Trung bình",
                recommended_action=title,
                estimated_time=f"{duration} ngày",
                estimated_cost=survey_cost,
                surveyor=staff,
            )
            requires_approval = external or cost >= 3000000
            plan_time = created_at + timedelta(hours=10)
            if flag == "reject":
                rejected = RepairPlan.objects.create(
                    code=f"PA-{8000 + index}R",
                    request=obj,
                    title=f"{title} (dự toán lần 1)",
                    repair_type=repair_type,
                    estimated_cost=int(cost * 1.45),
                    estimated_duration=f"{duration} ngày",
                    description=title,
                    proposed_by=users["U02"],
                    requires_approval=True,
                    approval_status=RepairPlanStatus.REJECTED,
                    rejected_by=users["U04"],
                    rejected_at=plan_time + timedelta(hours=20),
                    rejection_reason="Dự toán cao so với mặt bằng giá, đề nghị bổ sung báo giá đối chứng.",
                )
                RepairPlan.objects.filter(pk=rejected.pk).update(proposed_at=plan_time)
                ApprovalAction.objects.create(
                    plan=rejected, actor=users["U04"], action="REJECTED", comments=rejected.rejection_reason
                )
                plan_time += timedelta(days=1)
            plan = RepairPlan.objects.create(
                code=f"PA-{8000 + index}",
                request=obj,
                title=title,
                repair_type=repair_type,
                estimated_cost=cost,
                estimated_duration=f"{duration} ngày",
                description=title,
                proposed_by=users["U02"],
                requires_approval=requires_approval,
                approval_status=RepairPlanStatus.APPROVED,
                approved_by=users["U04"] if requires_approval else None,
                approved_at=plan_time + timedelta(hours=8),
            )
            RepairPlan.objects.filter(pk=plan.pk).update(proposed_at=plan_time)
            ApprovalAction.objects.create(
                plan=plan,
                actor=users["U04"] if requires_approval else users["U02"],
                action="APPROVED" if requires_approval else "AUTO_APPROVED",
            )
            if external:
                expected_end = (plan_time + timedelta(days=duration)).date()
                actual_end = expected_end + timedelta(days=3 if flag == "late" else 0)
                work = ExternalWork.objects.create(
                    code=f"TN-{8000 + index}",
                    request=obj,
                    plan=plan,
                    title=title,
                    contractor=contractor,
                    start_date=plan_time.date(),
                    expected_end_date=expected_end,
                    actual_end_date=actual_end,
                    progress=100,
                    status=ExternalWorkStatus.COMPLETED,
                    work_result="Đã hoàn thành theo hợp đồng.",
                )
                ExternalWorkEvent.objects.create(work=work, actor=users["U05"], action="Hoàn thành thi công")
                if flag == "fail":
                    first = AcceptanceRecord.objects.create(
                        code=f"NT-{8000 + index}A",
                        request=obj,
                        inspection_date=actual_end,
                        inspector=inspector_user,
                        check_items="Kiểm tra vận hành thực tế theo hạng mục hợp đồng.",
                        result="FAIL",
                        remediation_notes="Chưa đạt yêu cầu kỹ thuật, nhà thầu phải khắc phục.",
                    )
                    AcceptanceRecord.objects.filter(pk=first.pk).update(created_at=completed_at - timedelta(days=2))
                record = AcceptanceRecord.objects.create(
                    code=f"NT-{8000 + index}",
                    request=obj,
                    inspection_date=completed_at.date(),
                    inspector=inspector_user,
                    check_items="Kiểm tra vận hành thực tế theo hạng mục hợp đồng.",
                    result="PASS",
                    notes="Đạt yêu cầu.",
                )
                AcceptanceRecord.objects.filter(pk=record.pk).update(created_at=completed_at)
            record_request_event(obj, requester, "Tạo yêu cầu", "Dữ liệu lịch sử.", timeline_stage="Gửi yêu cầu")
            record_request_event(obj, staff, "Hoàn thành", "Đã xử lý xong.", timeline_stage="Xác nhận hoàn thành")
            RequestEvent.objects.filter(request=obj, action="Tạo yêu cầu").update(created_at=created_at)
            RequestEvent.objects.filter(request=obj, action="Hoàn thành").update(created_at=completed_at)
            obj.timeline.filter(stage="Gửi yêu cầu").update(created_at=created_at)
            obj.timeline.filter(stage="Xác nhận hoàn thành").update(created_at=completed_at)
            RepairRequest.objects.filter(pk=obj.pk).update(created_at=created_at, updated_at=completed_at)
            created_count += 1
        return created_count

    # ------------------------------------------------------------------
    # Tình huống demo cho từng điểm AI.
    # ------------------------------------------------------------------
    def _seed_demo_cases(self, users, facilities, now):
        created_count = 0
        for case in DEMO_CASES:
            if RepairRequest.objects.filter(code=case["code"]).exists():
                continue
            facility = facilities[case["facility"]]
            requester = users[case["requester"]]
            created_at = now - timedelta(hours=case["hours_ago"])
            staff = users[case["staff"]] if case.get("staff") else None
            plan_data = case.get("plan")
            obj = RepairRequest.objects.create(
                code=case["code"],
                **self._base_values(facility, requester, case["title"], case["description"], case["location"]),
                priority=case["priority"],
                status=case["status"],
                issue_category=case.get("category", "") if case["status"] != "NEW" else "",
                assigned_staff=staff,
                assigned_at=created_at + timedelta(hours=2) if staff else None,
                repair_type=plan_data["repair_type"] if plan_data else None,
                needs_approval=bool(plan_data),
                estimated_cost=plan_data["cost"] if plan_data else None,
            )
            record_request_event(obj, requester, "Tạo yêu cầu", "Yêu cầu mẫu cho demo Trợ lý AI.", timeline_stage="Gửi yêu cầu")
            if case["status"] != "NEW":
                record_request_event(obj, users["U02"], "Tiếp nhận yêu cầu", timeline_stage="Tiếp nhận yêu cầu")
            if staff:
                record_request_event(
                    obj, users["U02"], "Phân công cán bộ phụ trách",
                    f"Đã phân công cho {staff.get_full_name()}.", timeline_stage="Phân công cán bộ",
                )
            if case.get("survey"):
                Survey.objects.create(
                    request=obj, survey_date=created_at + timedelta(hours=6), surveyor=staff, **case["survey"]
                )
                record_request_event(
                    obj, staff, "Ghi nhận kết quả khảo sát", case["survey"]["findings"],
                    timeline_stage="Khảo sát hiện trạng",
                )
            if plan_data:
                plan = RepairPlan.objects.create(
                    code=f"PA-{case['code'][3:]}",
                    request=obj,
                    title=plan_data["title"],
                    repair_type=plan_data["repair_type"],
                    estimated_cost=plan_data["cost"],
                    estimated_duration=plan_data["duration"],
                    materials=plan_data["materials"],
                    description=plan_data["title"],
                    proposed_by=users["U02"],
                    requires_approval=True,
                    approval_status=RepairPlanStatus.APPROVED if plan_data.get("approved") else RepairPlanStatus.PENDING,
                    approved_by=users["U04"] if plan_data.get("approved") else None,
                    approved_at=now - timedelta(hours=20) if plan_data.get("approved") else None,
                )
                ApprovalAction.objects.create(plan=plan, actor=users["U02"], action="SUBMITTED", comments="Gửi phê duyệt")
                if plan_data.get("approved"):
                    ApprovalAction.objects.create(plan=plan, actor=users["U04"], action="APPROVED", comments="Đồng ý phương án.")
                    record_request_event(obj, users["U04"], "Phê duyệt phương án", "Ban Giám hiệu đã phê duyệt phương án.")
                if case.get("work"):
                    work = ExternalWork.objects.create(
                        code=f"TN-{case['code'][3:]}", request=obj, plan=plan, title=plan.title,
                        status=ExternalWorkStatus.PENDING,
                    )
                    ExternalWorkEvent.objects.create(work=work, actor=users["U04"], action="Tiếp nhận công việc")
                record_request_event(
                    obj, users["U02"], "Lập phương án xử lý", plan.title, timeline_stage="Lập phương án sửa chữa"
                )
                if not plan_data.get("approved"):
                    Notification.objects.get_or_create(
                        request=obj, target_role=Role.DIRECTOR, title="Phương án chờ phê duyệt",
                        defaults={"message": f"{obj.code}: {obj.title}", "type": "info"},
                    )
            if case["status"] == "NEW":
                Notification.objects.get_or_create(
                    request=obj, target_role=Role.FACILITY_ADMIN, title="Yêu cầu sửa chữa mới",
                    defaults={"message": f"{obj.code}: {obj.title}", "type": "info"},
                )
            RepairRequest.objects.filter(pk=obj.pk).update(created_at=created_at)
            RequestEvent.objects.filter(request=obj, action="Tạo yêu cầu").update(created_at=created_at)
            created_count += 1
        return created_count

    def _sync_sequences(self):
        for prefix, model in (
            ("YC", RepairRequest),
            ("PA", RepairPlan),
            ("TN", ExternalWork),
            ("NT", AcceptanceRecord),
        ):
            values = model.objects.filter(code__startswith=f"{prefix}-").values_list(
                "code", flat=True
            )
            highest = max(
                (
                    int(code[len(prefix) + 1 :])
                    for code in values
                    if code[len(prefix) + 1 :].isdigit()
                ),
                default=0,
            )
            sequence, _ = BusinessSequence.objects.get_or_create(prefix=prefix)
            if sequence.last_value < highest:
                sequence.last_value = highest
                sequence.save(update_fields=["last_value"])
