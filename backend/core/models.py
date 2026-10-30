import uuid

from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class BusinessSequence(models.Model):
    prefix = models.CharField(max_length=8, primary_key=True)
    last_value = models.PositiveIntegerField(default=0)


class Role(models.TextChoices):
    REQUESTER = "REQUESTER", "Người yêu cầu"
    FACILITY_ADMIN = "FACILITY_ADMIN", "Quản trị CSVC"
    STAFF = "STAFF", "Cán bộ phụ trách"
    DIRECTOR = "DIRECTOR", "Ban Giám hiệu"
    PROCUREMENT = "PROCUREMENT", "BP Đầu tư, Mua sắm & XD"


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, blank=True)
    role = models.CharField(max_length=24, choices=Role.choices, default=Role.REQUESTER)
    role_title = models.CharField(max_length=120, blank=True)
    user_type = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=40, blank=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = f"USR-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.get_full_name() or self.username}"


class FacilityStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Đang hoạt động"
    UNDER_REPAIR = "UNDER_REPAIR", "Đang sửa chữa"
    INACTIVE = "INACTIVE", "Ngưng hoạt động"


class Facility(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=200)
    facility_type = models.CharField(max_length=100)
    building = models.CharField(max_length=100)
    location = models.CharField(max_length=200, blank=True)
    managed_by = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=20, choices=FacilityStatus.choices, default=FacilityStatus.ACTIVE
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]
        indexes = [models.Index(fields=["building", "facility_type"])]

    def __str__(self):
        return f"{self.code} - {self.name}"


class RequestStatus(models.TextChoices):
    NEW = "NEW", "Mới"
    NEEDS_INFORMATION = "NEEDS_INFORMATION", "Chờ bổ sung"
    ACCEPTED = "ACCEPTED", "Đã tiếp nhận"
    SURVEYING = "SURVEYING", "Đang khảo sát"
    WAITING_FOR_PLAN = "WAITING_FOR_PLAN", "Chờ phương án"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL", "Chờ phê duyệt"
    INTERNAL_REPAIR = "INTERNAL_REPAIR", "Đang xử lý nội bộ"
    WAITING_FOR_EXTERNAL_WORK = "WAITING_FOR_EXTERNAL_WORK", "Chờ thực hiện thuê ngoài"
    EXTERNAL_WORK_IN_PROGRESS = "EXTERNAL_WORK_IN_PROGRESS", "Đang thực hiện thuê ngoài"
    WAITING_FOR_ACCEPTANCE = "WAITING_FOR_ACCEPTANCE", "Chờ nghiệm thu"
    WAITING_FOR_CONFIRMATION = "WAITING_FOR_CONFIRMATION", "Chờ xác nhận"
    NEEDS_REMEDIATION = "NEEDS_REMEDIATION", "Cần khắc phục"
    WAITING_REMEDIATION_RESPONSE = "WAITING_REMEDIATION_RESPONSE", "Chờ NCC khắc phục (72h)"
    OVERDUE_REMEDIATION = "OVERDUE_REMEDIATION", "Quá hạn 72h - Xử lý HĐ"
    COMPLETED = "COMPLETED", "Hoàn thành"
    CANCELLED = "CANCELLED", "Đã hủy"


class RepairType(models.TextChoices):
    INTERNAL = "INTERNAL", "Sửa chữa nội bộ"
    EXTERNAL = "EXTERNAL", "Thuê ngoài"


class RepairRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True, blank=True)
    title = models.CharField(max_length=200)
    facility = models.ForeignKey(
        Facility, null=True, blank=True, on_delete=models.SET_NULL, related_name="requests"
    )
    facility_code = models.CharField(max_length=30, blank=True)
    facility_name = models.CharField(max_length=200, blank=True)
    facility_type = models.CharField(max_length=100, blank=True)
    building = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    requester = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="repair_requests"
    )
    requester_name = models.CharField(max_length=150)
    requester_type = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=200, blank=True)
    contact_info = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    impact = models.TextField(blank=True)
    discovered_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(
        max_length=10,
        choices=[
            ("LOW", "Xử lý sau"),
            ("MEDIUM", "Xử lý sớm"),
            ("HIGH", "Khẩn cấp"),
            ("URGENT", "Khẩn cấp"),
        ],
        default="MEDIUM",
    )
    status = models.CharField(
        max_length=32, choices=RequestStatus.choices, default=RequestStatus.NEW
    )
    repair_type = models.CharField(
        max_length=10, choices=RepairType.choices, null=True, blank=True
    )
    assigned_staff = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="assigned_repair_requests",
        limit_choices_to={"role": Role.STAFF},
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    needs_approval = models.BooleanField(default=False)
    estimated_cost = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    internal_repair_result = models.JSONField(default=dict, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="completed_requests"
    )
    acceptance_result = models.CharField(
        max_length=4, choices=[("PASS", "Đạt"), ("FAIL", "Không đạt")], blank=True
    )
    remediation_notes = models.TextField(blank=True)
    remediation_requested_at = models.DateTimeField(null=True, blank=True)
    remediation_deadline = models.DateTimeField(null=True, blank=True)
    remediation_hours = models.PositiveSmallIntegerField(default=72)
    remediation_response_received = models.BooleanField(default=False)
    remediation_response_date = models.DateField(null=True, blank=True)
    remediation_response_note = models.TextField(blank=True)
    remediation_status = models.CharField(max_length=40, blank=True)
    contractor = models.CharField(max_length=200, blank=True)
    external_progress = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    rejection_reason = models.TextField(blank=True)
    supplement_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["requester", "status"]),
            models.Index(fields=["assigned_staff", "status"]),
            models.Index(fields=["building", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.code:
            from core.services import next_business_code

            self.code = next_business_code("YC", RepairRequest)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.title}"


class RequestAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        RepairRequest, on_delete=models.CASCADE, related_name="attachments"
    )
    file_name = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class Survey(models.Model):
    request = models.OneToOneField(
        RepairRequest, on_delete=models.CASCADE, related_name="survey"
    )
    survey_date = models.DateTimeField()
    findings = models.TextField()
    root_cause = models.TextField()
    damage_level = models.CharField(max_length=60, blank=True)
    recommended_action = models.TextField(blank=True)
    estimated_time = models.CharField(max_length=100, blank=True)
    estimated_cost = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    surveyor = models.ForeignKey(User, on_delete=models.PROTECT, related_name="surveys")
    completed_at = models.DateTimeField(auto_now_add=True)


class RepairPlanStatus(models.TextChoices):
    PENDING = "PENDING", "Chờ phê duyệt"
    APPROVED = "APPROVED", "Đã phê duyệt"
    REJECTED = "REJECTED", "Từ chối"


class RepairPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True, blank=True)
    request = models.ForeignKey(
        RepairRequest, on_delete=models.CASCADE, related_name="repair_plans"
    )
    title = models.CharField(max_length=200)
    repair_type = models.CharField(max_length=10, choices=RepairType.choices)
    description = models.TextField(blank=True)
    materials = models.TextField(blank=True)
    estimated_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    estimated_duration = models.CharField(max_length=100, blank=True)
    proposed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="proposed_plans")
    proposed_at = models.DateTimeField(auto_now_add=True)
    requires_approval = models.BooleanField(default=False)
    approval_status = models.CharField(
        max_length=10, choices=RepairPlanStatus.choices, default=RepairPlanStatus.PENDING
    )
    approved_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="approved_plans"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="rejected_plans"
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-proposed_at"]
        indexes = [models.Index(fields=["approval_status", "proposed_at"])]

    def save(self, *args, **kwargs):
        if not self.code:
            from core.services import next_business_code

            self.code = next_business_code("PA", RepairPlan)
        super().save(*args, **kwargs)


class ApprovalAction(models.Model):
    plan = models.ForeignKey(RepairPlan, on_delete=models.CASCADE, related_name="approval_history")
    actor = models.ForeignKey(User, on_delete=models.PROTECT)
    action = models.CharField(max_length=20)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class ExternalWorkStatus(models.TextChoices):
    PENDING = "PENDING", "Chờ tiếp nhận"
    IN_PROGRESS = "IN_PROGRESS", "Đang thực hiện"
    WORK_COMPLETED = "WORK_COMPLETED", "Đã thực hiện xong"
    WAITING_ACCEPTANCE = "WAITING_ACCEPTANCE", "Chờ nghiệm thu"
    NEEDS_REMEDIATION = "NEEDS_REMEDIATION", "Cần khắc phục"
    OVERDUE_REMEDIATION = "OVERDUE_REMEDIATION", "Quá hạn 72h"
    COMPLETED = "COMPLETED", "Hoàn thành"


class ExternalWork(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True, blank=True)
    request = models.ForeignKey(
        RepairRequest, on_delete=models.CASCADE, related_name="external_works"
    )
    plan = models.ForeignKey(
        RepairPlan, null=True, blank=True, on_delete=models.SET_NULL, related_name="external_works"
    )
    title = models.CharField(max_length=200)
    contractor = models.CharField(max_length=200, blank=True)
    contractor_contact = models.CharField(max_length=150, blank=True)
    start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)
    actual_end_date = models.DateField(null=True, blank=True)
    progress = models.PositiveSmallIntegerField(
        default=0, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    status = models.CharField(
        max_length=24, choices=ExternalWorkStatus.choices, default=ExternalWorkStatus.PENDING
    )
    work_result = models.TextField(blank=True)
    work_notes = models.TextField(blank=True)
    remediation_content = models.TextField(blank=True)
    remediation_requested_at = models.DateTimeField(null=True, blank=True)
    remediation_deadline = models.DateTimeField(null=True, blank=True)
    work_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["request", "plan"],
                condition=models.Q(plan__isnull=False),
                name="unique_external_work_per_plan",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.code:
            from core.services import next_business_code

            self.code = next_business_code("TN", ExternalWork)
        super().save(*args, **kwargs)


class ExternalWorkEvent(models.Model):
    work = models.ForeignKey(ExternalWork, on_delete=models.CASCADE, related_name="history")
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=120)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class AcceptanceRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True, blank=True)
    request = models.ForeignKey(
        RepairRequest, on_delete=models.CASCADE, related_name="acceptance_records"
    )
    inspection_date = models.DateField()
    inspector = models.ForeignKey(User, on_delete=models.PROTECT, related_name="inspections")
    check_items = models.TextField()
    result = models.CharField(max_length=4, choices=[("PASS", "Đạt"), ("FAIL", "Không đạt")])
    notes = models.TextField(blank=True)
    remediation_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.code:
            from core.services import next_business_code

            self.code = next_business_code("NT", AcceptanceRecord)
        super().save(*args, **kwargs)


class RequestEvent(models.Model):
    request = models.ForeignKey(RepairRequest, on_delete=models.CASCADE, related_name="history")
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=150)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class RequestTimelineEvent(models.Model):
    request = models.ForeignKey(RepairRequest, on_delete=models.CASCADE, related_name="timeline")
    stage = models.CharField(max_length=150)
    status = models.CharField(max_length=20, default="COMPLETED")
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, default="info")
    target_role = models.CharField(max_length=24, choices=Role.choices)
    recipient = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.CASCADE, related_name="notifications"
    )
    request = models.ForeignKey(
        RepairRequest, null=True, blank=True, on_delete=models.CASCADE, related_name="notifications"
    )
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ContractHandling(models.Model):
    request = models.OneToOneField(
        RepairRequest, on_delete=models.CASCADE, related_name="contract_action"
    )
    actions = models.JSONField(default=list)
    violation_clause = models.CharField(max_length=250, blank=True)
    overdue_note = models.TextField()
    penalty_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    deduction_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    payment_suspension_until = models.DateField(null=True, blank=True)
    contract_extension_until = models.DateField(null=True, blank=True)
    termination_reason = models.TextField(blank=True)
    contract_notes = models.TextField(blank=True)
    processed_by = models.ForeignKey(User, on_delete=models.PROTECT)
    processed_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default="PROCESSED")
