"""Tạo đề xuất, lưu nhật ký và đối chiếu với quyết định thực tế của con người."""

from django.utils import timezone

from core.ai.agent import run_agent
from core.models import AISuggestion, AISuggestionKind, AISuggestionStatus

UNEVALUATED_KINDS = {AISuggestionKind.CHAT}


def generate_suggestion(kind, user, request_obj=None, draft=None, message="", history=None):
    result = run_agent(kind, user, request_obj=request_obj, draft=draft, message=message, history=history)
    if request_obj is not None:
        AISuggestion.objects.filter(
            request=request_obj, kind=kind, status=AISuggestionStatus.PENDING
        ).update(status=AISuggestionStatus.NOT_APPLICABLE, feedback_note="Được thay thế bởi lần phân tích mới.")
    return AISuggestion.objects.create(
        request=request_obj,
        kind=kind,
        created_by=user,
        prompt=message or (str(draft)[:2000] if draft else ""),
        source=result.source,
        model_name=result.model_name,
        output=result.output,
        tool_trace=result.trace,
        latency_ms=result.latency_ms,
        error=result.error,
        status=AISuggestionStatus.NOT_APPLICABLE if kind in UNEVALUATED_KINDS else AISuggestionStatus.PENDING,
    )


def _staff_outcome(output, final):
    chosen = final.get("staff_code")
    if chosen == output.get("best_staff_code"):
        return AISuggestionStatus.ACCEPTED, "Chọn đúng cán bộ được đề xuất số 1."
    codes = [r.get("staff_code") for r in output.get("recommendations", [])]
    if chosen in codes:
        return AISuggestionStatus.MODIFIED, f"Chọn cán bộ đề xuất số {codes.index(chosen) + 1}."
    return AISuggestionStatus.REJECTED, "Chọn cán bộ ngoài danh sách đề xuất."


def evaluate(kind, output, final):
    if kind in (AISuggestionKind.TRIAGE, AISuggestionKind.TRIAGE_PREVIEW):
        same_priority = output.get("priority") == final.get("priority")
        same_category = kind == AISuggestionKind.TRIAGE_PREVIEW or not final.get("category") or output.get("category") == final.get("category")
        if same_priority and same_category:
            return AISuggestionStatus.ACCEPTED, "Giữ nguyên mức độ và loại sự cố AI đề xuất."
        return AISuggestionStatus.MODIFIED, "Điều chỉnh mức độ/loại sự cố so với đề xuất."
    if kind in (AISuggestionKind.ASSIGN_SURVEY, AISuggestionKind.ASSIGN_INSPECTOR):
        return _staff_outcome(output, final)
    if kind == AISuggestionKind.PLAN:
        if output.get("repair_type") != final.get("repair_type"):
            return AISuggestionStatus.REJECTED, "Chọn hình thức sửa chữa khác đề xuất."
        suggested = output.get("estimated_cost") or 0
        actual = final.get("estimated_cost") or 0
        if abs(actual - suggested) <= max(suggested, 1) * 0.2:
            return AISuggestionStatus.ACCEPTED, "Cùng hình thức, dự toán chênh không quá 20%."
        return AISuggestionStatus.MODIFIED, "Cùng hình thức nhưng điều chỉnh dự toán."
    if kind == AISuggestionKind.APPROVAL_BRIEF:
        approve_recommended = output.get("recommendation") in ("APPROVE", "APPROVE_WITH_CONDITIONS")
        approved = final.get("decision") == "APPROVED"
        if approve_recommended == approved:
            return AISuggestionStatus.ACCEPTED, "Quyết định của BGH trùng khuyến nghị."
        return AISuggestionStatus.REJECTED, "BGH quyết định khác khuyến nghị."
    if kind == AISuggestionKind.SURVEY_ASSIST:
        if bool(output.get("can_repair_immediately")) != bool(final.get("can_repair_immediately")):
            return AISuggestionStatus.REJECTED, "Cán bộ đánh giá khác về khả năng sửa ngay."
        suggested, actual = output.get("estimated_cost"), final.get("estimated_cost")
        if suggested and actual and abs(actual - suggested) > max(suggested, 1) * 0.3:
            return AISuggestionStatus.MODIFIED, "Cùng hướng xử lý nhưng dự toán khảo sát khác đáng kể."
        return AISuggestionStatus.ACCEPTED, "Cán bộ thống nhất hướng xử lý AI gợi ý."
    if kind == AISuggestionKind.ACCEPTANCE_CHECKLIST:
        text = str(final.get("check_items", "")).lower()
        items = output.get("check_items") or []
        used = sum(1 for item in items if item.lower()[:25] in text)
        if items and used / len(items) >= 0.5:
            return AISuggestionStatus.ACCEPTED, f"Biên bản dùng {used}/{len(items)} hạng mục AI soạn."
        if used:
            return AISuggestionStatus.MODIFIED, f"Biên bản dùng {used}/{len(items)} hạng mục AI soạn."
        return AISuggestionStatus.REJECTED, "Biên bản không dùng hạng mục AI soạn."
    if kind == AISuggestionKind.CONTRACTOR:
        chosen = str(final.get("contractor", "")).strip().lower()
        if chosen and chosen == str(output.get("best_contractor") or "").lower():
            return AISuggestionStatus.ACCEPTED, "Chọn đúng nhà thầu được đề xuất số 1."
        names = [r.get("contractor", "").lower() for r in output.get("recommendations", [])]
        if chosen in names:
            return AISuggestionStatus.MODIFIED, f"Chọn nhà thầu đề xuất số {names.index(chosen) + 1}."
        return AISuggestionStatus.REJECTED, "Chọn nhà thầu ngoài danh sách đề xuất."
    return AISuggestionStatus.NOT_APPLICABLE, ""


def resolve_suggestion(request_obj, kind, user, final_value, suggestion_id=None):
    """Gắn quyết định thực tế vào đề xuất PENDING mới nhất (nếu có)."""
    queryset = AISuggestion.objects.filter(kind=kind, status=AISuggestionStatus.PENDING)
    if suggestion_id:
        suggestion = queryset.filter(pk=suggestion_id, created_by=user).first()
        if suggestion is not None and suggestion.request_id is None and request_obj is not None:
            suggestion.request = request_obj
    else:
        suggestion = queryset.filter(request=request_obj).order_by("-created_at").first()
    if suggestion is None:
        return None
    status, note = evaluate(kind, suggestion.output, final_value)
    suggestion.status = status
    suggestion.final_value = final_value
    suggestion.feedback_note = note
    suggestion.decided_by = user
    suggestion.decided_at = timezone.now()
    suggestion.save(update_fields=["request", "status", "final_value", "feedback_note", "decided_by", "decided_at"])
    return suggestion


def dismiss_suggestion(suggestion, user, note=""):
    suggestion.status = AISuggestionStatus.REJECTED
    suggestion.feedback_note = note or "Người dùng bỏ qua đề xuất."
    suggestion.decided_by = user
    suggestion.decided_at = timezone.now()
    suggestion.save(update_fields=["status", "feedback_note", "decided_by", "decided_at"])
    return suggestion
