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
from core.services import record_request_event


USERS = [
    ("U01", "nmanh", "Nguyễn", "Minh Anh", "REQUESTER", "Giảng viên", "LECTURER", "Khoa Quản trị Kinh doanh", "nmanh@due.edu.vn", "0901234567"),
    ("U02", "tqhuy", "Trần", "Quốc Huy", "FACILITY_ADMIN", "Quản trị CSVC", "LECTURER", "Phòng Quản trị Cơ sở vật chất", "tqhuy@due.edu.vn", "0902345678"),
    ("U03", "lhnam", "Lê", "Hoàng Nam", "STAFF", "Cán bộ phụ trách", "LECTURER", "Tổ Kỹ thuật Cơ sở vật chất", "lhnam@due.edu.vn", "0903456789"),
    ("U04", "nttha", "Nguyễn", "Thị Thu Hà", "DIRECTOR", "Ban Giám hiệu", "LECTURER", "Ban Giám hiệu Trường", "nttha@due.edu.vn", "0904567890"),
    ("U05", "pvbinh", "Phạm", "Văn Bình", "PROCUREMENT", "BP Đầu tư & Mua sắm", "LECTURER", "Bộ phận Đầu tư, Mua sắm & Xây dựng", "pvbinh@due.edu.vn", "0905678901"),
    ("U06", "sv_hoang", "Trần", "Minh Hoàng", "REQUESTER", "Sinh viên", "STUDENT", "Lớp 47K01.1 - Khoa QTKD", "hoang.tm@due.edu.vn", "0912345678"),
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

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
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

        self._sync_sequences()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete: 6 users, 12 facilities, {created_count} new sample requests."
            )
        )

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
