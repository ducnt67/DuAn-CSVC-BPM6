from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

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
    Survey,
    User,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Thông tin nghiệp vụ", {"fields": ("code", "role", "role_title", "user_type", "department", "phone")}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("Thông tin nghiệp vụ", {"fields": ("code", "role", "role_title", "user_type", "department", "phone")}),
    )
    list_display = ("username", "code", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("username", "email", "code", "first_name", "last_name")


@admin.register(RepairRequest)
class RepairRequestAdmin(admin.ModelAdmin):
    list_display = ("code", "title", "status", "priority", "requester", "assigned_staff", "created_at")
    list_filter = ("status", "priority", "repair_type", "building")
    search_fields = ("code", "title", "description", "facility_name")
    readonly_fields = ("code", "created_at", "updated_at")


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "facility_type", "building", "status")
    list_filter = ("facility_type", "building", "status")
    search_fields = ("code", "name", "location")


admin.site.register(
    (
        AcceptanceRecord,
        ApprovalAction,
        ContractHandling,
        ExternalWork,
        ExternalWorkEvent,
        Notification,
        RepairPlan,
        RequestAttachment,
        RequestEvent,
        RequestTimelineEvent,
        Survey,
    )
)
