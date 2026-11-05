from django.db import transaction
from django.db.models import Q

from core.models import (
    BusinessSequence,
    Notification,
    RepairRequest,
    RequestEvent,
    RequestTimelineEvent,
    Role,
)


def next_business_code(prefix, model=None):
    with transaction.atomic():
        sequence, _ = BusinessSequence.objects.get_or_create(prefix=prefix)
        sequence = BusinessSequence.objects.select_for_update().get(pk=sequence.pk)
        sequence.last_value += 1
        sequence.save(update_fields=["last_value"])
        return f"{prefix}-{sequence.last_value:04d}"


def requests_visible_to(user):
    """Phạm vi yêu cầu mà một tài khoản được xem (dùng chung cho API và công cụ của Trợ lý AI)."""
    queryset = RepairRequest.objects.all()
    if user.role == Role.REQUESTER:
        queryset = queryset.filter(requester=user)
    elif user.role == Role.STAFF:
        queryset = queryset.filter(Q(assigned_staff=user) | Q(acceptance_inspector=user)).distinct()
    elif user.role == Role.PROCUREMENT:
        queryset = queryset.filter(external_works__isnull=False).distinct()
    return queryset


def effective_inspector(request_obj):
    """Cán bộ nghiệm thu thực tế: người được phân công nghiệm thu, nếu chưa có thì là cán bộ khảo sát."""
    return request_obj.acceptance_inspector or request_obj.assigned_staff


def is_effective_inspector(request_obj, user):
    inspector = effective_inspector(request_obj)
    return inspector is not None and inspector.pk == user.pk


def record_request_event(request, actor, action, detail="", timeline_stage=None, timeline_status="COMPLETED"):
    RequestEvent.objects.create(
        request=request,
        actor=actor,
        action=action,
        detail=detail,
    )
    if timeline_stage:
        RequestTimelineEvent.objects.create(
            request=request,
            stage=timeline_stage,
            status=timeline_status,
            actor=actor,
            note=detail,
        )


def notify_role(role, title, message, request=None, recipient=None, notification_type="info"):
    return Notification.objects.create(
        target_role=role,
        title=title,
        message=message,
        request=request,
        recipient=recipient,
        type=notification_type,
    )
