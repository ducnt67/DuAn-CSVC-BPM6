from django.db import transaction

from core.models import BusinessSequence, Notification, RequestEvent, RequestTimelineEvent


def next_business_code(prefix, model=None):
    with transaction.atomic():
        sequence, _ = BusinessSequence.objects.get_or_create(prefix=prefix)
        sequence = BusinessSequence.objects.select_for_update().get(pk=sequence.pk)
        sequence.last_value += 1
        sequence.save(update_fields=["last_value"])
        return f"{prefix}-{sequence.last_value:04d}"


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
