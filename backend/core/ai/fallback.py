"""Bộ luật dự phòng: dùng khi chưa cấu hình Gemini, mạng lỗi hoặc mô hình quá tải.

Dùng chính các công cụ của agent (nên vẫn có "AI đã tra cứu"), cho kết quả cùng định dạng
để giao diện không phải phân biệt nguồn.
"""

from core.ai.catalog import (
    HIGH_IMPACT_KEYWORDS,
    INTERNAL_APPROVAL_THRESHOLD,
    INTERNAL_COST_LIMIT,
    ELECTRIC_POINT_KEYWORDS,
    LOW_IMPACT_KEYWORDS,
    SAFETY_KEYWORDS,
    WATER_KEYWORDS,
    category_label,
    guess_category,
    matched_keywords,
    strip_accents,
)
from core.ai.tasks import vnd

def cost_reference(req, similar):
    plans = req.get("plans") or []
    pending = next((p for p in reversed(plans) if p["approval_status"] == "PENDING"), plans[-1] if plans else {})
    plan_cost = pending.get("estimated_cost") or req.get("estimated_cost") or 0
    survey_cost = (req.get("survey") or {}).get("estimated_cost")
    closed = [i["final_cost"] for i in similar.get("items", []) if not i["is_open"] and i.get("final_cost")]
    # Chỉ so với ca cùng quy mô (0,2x - 5x), tránh so một dự án thay mới với các lần sửa nhỏ.
    comparable = [c for c in closed if plan_cost and 0.2 * plan_cost <= c <= 5 * plan_cost]
    similar_avg = int(sum(comparable) / len(comparable)) if comparable else None
    base = survey_cost or similar_avg
    return {
        "plan_cost": plan_cost,
        "survey_cost": survey_cost,
        "similar_avg": similar_avg,
        "similar_count": len(comparable),
        "deviation_pct": round((plan_cost - base) / base * 100) if base and plan_cost else None,
        "reference": "survey" if survey_cost else ("similar" if similar_avg else None),
    }


EXTERNAL_HINTS = ["thay moi", "mua moi", "bao hanh", "hang", "nha thau", "thue ngoai", "so luong lon", "toan bo he thong"]


def _priority_from_text(text):
    blob = strip_accents(text)
    safety = matched_keywords(blob, SAFETY_KEYWORDS)
    impact = matched_keywords(blob, HIGH_IMPACT_KEYWORDS)
    minor = matched_keywords(blob, LOW_IMPACT_KEYWORDS)
    if safety:
        return "URGENT", True, f"Có dấu hiệu nguy cơ mất an toàn ({', '.join(safety)})."
    water = matched_keywords(blob, WATER_KEYWORDS)
    electric = matched_keywords(blob, ELECTRIC_POINT_KEYWORDS)
    if water and electric:
        return "URGENT", True, (
            f"Nước tiếp xúc thiết bị điện ({', '.join(water + electric)}): nguy cơ chập, giật điện - cần ngắt điện khu vực."
        )
    if impact:
        return "HIGH", False, f"Thiết bị ngừng hoạt động/ảnh hưởng lớn ({', '.join(impact)})."
    if minor:
        return "LOW", False, f"Hư hỏng nhỏ, chưa ảnh hưởng nhiều tới việc sử dụng ({', '.join(minor)})."
    return "MEDIUM", False, "Không có dấu hiệu nguy hiểm hay ngừng hoạt động hoàn toàn; xử lý sớm trong 24-48 giờ."


def triage(user, context, call_tool, kind="TRIAGE"):
    req = context.get("request") or {}
    draft = context.get("draft") or {}
    title = req.get("title") or draft.get("title", "")
    description = req.get("description") or draft.get("description", "")
    facility = req.get("facility") or {"code": draft.get("facilityCode"), "type": draft.get("facilityType")}
    category, category_hits = guess_category(title, description, facility_type=facility.get("type") or "")
    priority, safety, reason = _priority_from_text(f"{title} {description} {req.get('impact', '') or draft.get('impact', '')}")
    if req.get("code"):
        similar = call_tool("find_similar_requests", {"code": req["code"]})
    else:
        similar = call_tool("find_similar_requests", {"text": f"{title} {description}", "facility_code": facility.get("code") or ""})
    if facility.get("code"):
        history = call_tool("get_facility_history", {"facility_code": facility["code"]})
        same_recent = 0 if history.get("error") else (history.get("recent_by_category") or {}).get(category, 0)
        if same_recent >= 2 and priority == "MEDIUM":
            # Chỉ nâng khi lặp lại cùng loại sự cố; hư hỏng nhỏ (LOW) không bị nâng.
            priority = "HIGH"
            reason += f" Thiết bị đã có {same_recent} sự cố cùng loại trong 180 ngày nên nâng mức ưu tiên."
    duplicates = [
        {"code": d["code"], "reason": f"Đang mở ({d['status_label']}), cùng thiết bị/mô tả tương tự."}
        for d in similar.get("possible_duplicates", [])
    ]
    short = len(description.strip()) < 25
    vague = not category_hits and len(description.strip()) < 80
    questions = []
    if short or vague:
        questions.append("Mô tả cụ thể hiện tượng hư hỏng (từ khi nào, mức độ, có nguy hiểm không)?")
    if vague:
        questions.append("Thiết bị hoặc bộ phận nào bị hỏng (đèn, điều hòa, máy chiếu, bàn ghế, cửa...)?")
        questions.append("Sự cố có ảnh hưởng tới lịch học hoặc an toàn người sử dụng không?")
    if not (req.get("location") or draft.get("location")):
        questions.append("Vị trí chính xác (tầng, phòng) của sự cố?")
    summary = f"Đề xuất loại '{category_label(category)}', mức độ {priority}."
    if duplicates:
        summary += f" Có thể trùng với {', '.join(d['code'] for d in duplicates)}."
    if kind == "TRIAGE_PREVIEW":
        return {
            "category": category, "priority": priority, "priority_reason": reason, "safety_risk": safety,
            "possible_duplicates": duplicates, "missing_info": questions, "summary": summary, "confidence": 0.55,
        }
    return {
        "category": category,
        "priority": priority,
        "priority_reason": reason,
        "safety_risk": safety,
        "impact_summary": "Nguy cơ mất an toàn cho người sử dụng." if safety else "Ảnh hưởng tới việc sử dụng phòng/thiết bị.",
        "possible_duplicates": duplicates,
        "need_more_info": bool(questions),
        "questions_for_requester": questions,
        "summary": summary,
        "confidence": 0.55,
    }


def _rank_staff(staff_list, category, avoid_code=None, inspector=False):
    ranked = []
    for staff in staff_list:
        score = 40
        reasons, concerns = [], []
        if staff["matches_category"]:
            score += 35
            reasons.append(f"Đúng chuyên môn: {', '.join(staff['skill_labels'])}.")
        else:
            concerns.append(f"Chuyên môn chính là {', '.join(staff['skill_labels'])}.")
        same = staff.get("completed_same_category") or 0
        if same:
            score += min(15, same * 3)
            reasons.append(f"Đã xử lý {same} ca cùng loại.")
        score -= staff["active_tasks"] * 6 + staff["active_urgent"] * 4
        if staff["active_tasks"] == 0:
            reasons.append("Hiện không có việc đang mở.")
        elif staff["active_tasks"] >= 3:
            concerns.append(f"Đang có {staff['active_tasks']} việc mở ({staff['active_urgent']} việc khẩn).")
        else:
            reasons.append(f"Khối lượng vừa phải ({staff['active_tasks']} việc đang mở).")
        if inspector:
            if avoid_code and staff["code"] == avoid_code:
                score -= 15
                concerns.append("Là người đã khảo sát/đề xuất, kém khách quan hơn.")
            elif avoid_code:
                score += 5
                reasons.append("Độc lập với người đã khảo sát.")
            if staff["inspections_done"]:
                reasons.append(f"Đã nghiệm thu {staff['inspections_done']} lần ({staff['inspections_found_issues']} lần phát hiện lỗi).")
        ranked.append({
            "staff_code": staff["code"],
            "staff_name": staff["name"],
            "department": staff["department"],
            "score": max(0, min(100, score)),
            "reasons": reasons,
            "concerns": concerns,
        })
    ranked.sort(key=lambda r: r["score"], reverse=True)
    return ranked[:3]


def _category_of(context):
    req = context.get("request") or {}
    return req.get("issue_category") or req.get("issue_category_guess") or "OTHER"


def assign_survey(user, context, call_tool):
    req = context["request"]
    category = _category_of(context)
    staff = call_tool("list_staff_workload", {"category": category, "exclude_code": req["code"]})["staff"]
    ranked = _rank_staff(staff, category)
    if not ranked:
        return {"recommendations": [], "best_staff_code": None, "summary": "Chưa có cán bộ kỹ thuật nào.", "confidence": 0.2}
    best = ranked[0]
    return {
        "recommendations": ranked,
        "best_staff_code": best["staff_code"],
        "summary": f"{best['staff_name']} phù hợp nhất cho sự cố '{category_label(category)}'.",
        "confidence": 0.6,
    }


def assign_inspector(user, context, call_tool):
    req = context["request"]
    category = _category_of(context)
    staff = call_tool("list_staff_workload", {"category": category, "exclude_code": req["code"]})["staff"]
    surveyor = (req.get("assigned_staff") or {}).get("code")
    contractor = (req.get("external_work") or {}).get("contractor")
    risky = False
    if contractor:
        perf = call_tool("get_contractor_performance", {"contractor": contractor, "category": category})
        risky = any(c["acceptance_fail"] for c in perf.get("contractors", []))
    ranked = _rank_staff(staff, category, avoid_code=surveyor, inspector=True)
    if not ranked:
        return {"recommendations": [], "best_staff_code": None, "summary": "Chưa có cán bộ kỹ thuật nào.", "independence_note": "", "confidence": 0.2}
    best = ranked[0]
    note = (
        f"Cán bộ khảo sát là {req['assigned_staff']['name']}; đề xuất ưu tiên người độc lập."
        if surveyor else "Chưa có cán bộ khảo sát."
    )
    if risky:
        note += f" Nhà thầu '{contractor}' từng có lần nghiệm thu không đạt, cần kiểm tra kỹ."
    return {
        "recommendations": ranked,
        "best_staff_code": best["staff_code"],
        "independence_note": note,
        "summary": f"Đề xuất {best['staff_name']} nghiệm thu.",
        "confidence": 0.6,
    }


def plan(user, context, call_tool):
    req = context["request"]
    survey = req.get("survey") or {}
    category = _category_of(context)
    similar = call_tool("find_similar_requests", {"code": req["code"]})
    stats = call_tool("get_cost_statistics", {"category": category})
    similar_costs = [i["final_cost"] for i in similar["items"] if i.get("final_cost")]
    similar_avg = int(sum(similar_costs) / len(similar_costs)) if similar_costs else None
    survey_cost = survey.get("estimated_cost")
    cost = survey_cost or similar_avg or stats.get("median_cost") or 500000
    hint_blob = strip_accents(f"{survey.get('recommended_action', '')} {survey.get('damage_level', '')} {req.get('title', '')}")
    external = cost >= INTERNAL_COST_LIMIT or bool(matched_keywords(hint_blob, EXTERNAL_HINTS))
    repair_type = "EXTERNAL" if external else "INTERNAL"
    reasons = []
    if external:
        reasons.append("Chi phí/khối lượng vượt khả năng tổ kỹ thuật hoặc cần thay mới, bảo hành hãng.")
    else:
        reasons.append(f"Tổ kỹ thuật có thể tự xử lý, chi phí dưới {vnd(INTERNAL_COST_LIMIT)}.")
    basis = f"Theo khảo sát {vnd(survey_cost)}" if survey_cost else "Chưa có dự toán khảo sát"
    if similar_avg:
        basis += f"; TB {len(similar_costs)} ca tương tự {vnd(similar_avg)}"
    risks = []
    if survey_cost and similar_avg and survey_cost > similar_avg * 1.4:
        risks.append("Dự toán khảo sát cao hơn đáng kể so với các ca tương tự, nên rà soát báo giá.")
    if external:
        perf = call_tool("get_contractor_performance", {"category": category})
        bad = [c["contractor"] for c in perf["contractors"] if c["acceptance_fail"]]
        if bad:
            risks.append(f"Lưu ý nhà thầu từng không đạt nghiệm thu: {', '.join(bad[:3])}.")
    return {
        "repair_type": repair_type,
        "title": f"{'Thuê ngoài' if external else 'Sửa chữa nội bộ'}: {survey.get('recommended_action') or req['title']}"[:200],
        "description": survey.get("recommended_action") or req.get("description", ""),
        "materials": "Theo đề xuất khảo sát" if survey else "",
        "estimated_cost": int(cost),
        "estimated_duration": survey.get("estimated_time") or ("7 ngày" if external else "2 ngày"),
        "needs_approval": external or cost >= INTERNAL_APPROVAL_THRESHOLD,
        "reasons": reasons,
        "cost_basis": basis,
        "risks": risks,
        "similar_cases": [i["code"] for i in similar["items"][:4]],
        "confidence": 0.55,
    }


def approval_brief(user, context, call_tool):
    req = context["request"]
    plans = req.get("plans") or []
    pending = next((p for p in reversed(plans) if p["approval_status"] == "PENDING"), plans[-1] if plans else {})
    category = _category_of(context)
    similar = call_tool("find_similar_requests", {"code": req["code"]})
    call_tool("get_cost_statistics", {"category": category})
    history = call_tool("get_facility_history", {"facility_code": req["facility"]["code"]}) if req["facility"].get("code") else {}
    # Ưu tiên so với dự toán khảo sát; ca tương tự chỉ tính khi cùng quy mô.
    reference = cost_reference(req, similar)
    plan_cost, survey_cost = reference["plan_cost"], reference["survey_cost"]
    similar_avg, deviation = reference["similar_avg"], reference["deviation_pct"]
    base = survey_cost or similar_avg
    all_closed = [i["final_cost"] for i in similar["items"] if i.get("final_cost") and not i["is_open"]]
    key_points = [f"Dự toán phương án: {vnd(plan_cost)}."]
    if survey_cost:
        key_points.append(f"Dự toán khảo sát: {vnd(survey_cost)}.")
    if similar_avg:
        key_points.append(f"Trung bình {reference['similar_count']} ca cùng quy mô đã xử lý: {vnd(similar_avg)}.")
    risks = []
    if history and history.get("recurring_issue"):
        risks.append(f"Thiết bị đã hỏng {history['requests_last_180_days']} lần trong 180 ngày - cân nhắc thay mới thay vì sửa.")
    rejected_before = [p for p in plans if p["approval_status"] == "REJECTED"]
    if rejected_before:
        key_points.append(f"Đã bị từ chối {len(rejected_before)} lần trước đó: {rejected_before[-1].get('rejection_reason')}")
    if pending.get("repair_type") == "EXTERNAL":
        perf = call_tool("get_contractor_performance", {"category": category})
        bad = [c["contractor"] for c in perf["contractors"] if c["acceptance_fail"] or c["late_jobs"]]
        if bad:
            risks.append(f"Khi chọn nhà thầu cùng lĩnh vực, kiểm soát chặt: {', '.join(bad[:3])} (từng không đạt nghiệm thu/trễ hạn).")
    if all_closed and not similar_avg:
        key_points.append("Quy mô phương án lớn hơn nhiều so với các ca sửa chữa trước (có thể là thay mới) - cần đánh giá hiệu quả đầu tư.")
    conditions, reason = [], ""
    if not survey_cost and not similar_avg:
        recommendation, verdict = "APPROVE_WITH_CONDITIONS", "Thiếu dữ liệu"
        conditions.append("Bổ sung báo giá đối chứng trước khi ký hợp đồng.")
    elif deviation is not None and deviation >= 40:
        recommendation, verdict = "REVISE", "Cao"
        reason = (
            f"Dự toán {vnd(plan_cost)} cao hơn khoảng {deviation}% so với mức tham chiếu {vnd(base)}. "
            "Đề nghị rà soát lại khối lượng, đơn giá hoặc bổ sung tối thiểu 2 báo giá đối chứng."
        )
    elif deviation is not None and deviation > 20:
        recommendation, verdict = "APPROVE_WITH_CONDITIONS", "Cao"
        conditions.append("Yêu cầu tối thiểu 2 báo giá đối chứng; giữ chi phí không vượt dự toán.")
    else:
        recommendation, verdict = "APPROVE", "Hợp lý"
    labels = {"APPROVE": "Đề xuất duyệt", "APPROVE_WITH_CONDITIONS": "Đề xuất duyệt có điều kiện", "REVISE": "Đề xuất trả lại để điều chỉnh"}
    return {
        "recommendation": recommendation,
        "summary": f"{labels[recommendation]}: dự toán {verdict.lower()} so với tham chiếu.",
        "key_points": key_points,
        "cost_assessment": {**reference, "verdict": verdict},
        "risks": risks,
        "conditions": conditions,
        "suggested_rejection_reason": reason,
        "similar_cases": [i["code"] for i in similar["items"][:4]],
        "confidence": 0.55,
    }


def chat(user, context, call_tool):
    stats = call_tool("get_overview_stats", {})
    urgent = ", ".join(f"{u['code']}" for u in stats["open_urgent"][:5]) or "không có"
    return {
        "answer": (
            "Trợ lý AI (Gemini) hiện chưa sẵn sàng nên mình chỉ trả lời được số liệu tổng quan:\n"
            f"- Tổng số yêu cầu: {stats['total']}, đang mở: {stats['open']}\n"
            f"- Việc khẩn đang mở: {urgent}\n"
            f"- Chờ Ban Giám hiệu duyệt: {stats['pending_approval']['count']} ({vnd(stats['pending_approval']['total_cost'])})\n"
            "Vui lòng thử lại sau để hỏi chi tiết hơn."
        )
    }


SURVEY_CHECKS = {
    "ELECTRICAL": (["Tiếp điểm ổ cắm/công tắc lỏng hoặc cháy", "Dây dẫn quá tải, xuống cấp", "Chấn lưu/bóng đèn hỏng"],
                   ["Đo điện áp và kiểm tra dòng tải", "Kiểm tra nhiệt độ dây, ổ cắm", "Kiểm tra aptomat/cầu dao nhánh"],
                   ["Ngắt điện nhánh trước khi tháo", "Dùng găng cách điện, bút thử điện"],
                   ["Bút thử điện, đồng hồ vạn năng", "Ổ cắm/công tắc/bóng dự phòng"]),
    "HVAC": (["Thiếu gas lạnh", "Dàn lạnh/dàn nóng bám bẩn", "Hỏng tụ/quạt hoặc block"],
             ["Đo áp suất gas, dòng chạy block", "Kiểm tra lưới lọc, ống thoát nước", "Kiểm tra quạt dàn nóng"],
             ["Ngắt nguồn trước khi mở vỏ", "Cẩn thận khi làm việc trên cao"],
             ["Đồng hồ đo gas", "Bộ vệ sinh dàn lạnh"]),
    "PLUMBING": (["Gioăng/van hao mòn", "Tắc nghẽn đường ống xả", "Rò rỉ mối nối âm tường"],
                 ["Khóa van tổng, kiểm tra đồng hồ nước", "Kiểm tra mối nối, gioăng", "Thông thử đường xả"],
                 ["Đặt biển cảnh báo sàn trơn"],
                 ["Gioăng, băng tan, keo silicone", "Dụng cụ thông tắc"]),
    "NETWORK_IT": (["Cáp/đầu bấm hỏng", "Switch/access point lỗi hoặc quá tải", "Cấu hình sai"],
                   ["Đo kiểm cáp bằng máy test", "Kiểm tra đèn trạng thái switch/AP", "Đo tốc độ tại điểm sự cố"],
                   ["Không tự ý khởi động lại thiết bị lõi giờ cao điểm"],
                   ["Máy test cáp, đầu RJ45, kìm bấm", "Laptop đo tốc độ"]),
    "AV_EQUIPMENT": (["Bóng đèn chiếu hết tuổi thọ", "Lỗi nguồn/bo mạch", "Lỗi cáp tín hiệu HDMI/VGA"],
                     ["Kiểm tra giờ sử dụng bóng", "Thử cáp và nguồn tín hiệu khác", "Kiểm tra quạt tản nhiệt"],
                     ["Để máy nguội trước khi tháo"],
                     ["Cáp HDMI/VGA dự phòng", "Remote, bộ chuyển đổi"]),
}


def survey_assist(user, context, call_tool):
    req = context["request"]
    category = _category_of(context)
    similar = call_tool("find_similar_requests", {"code": req["code"]})
    if req["facility"].get("code"):
        call_tool("get_facility_history", {"facility_code": req["facility"]["code"]})
    costs = [i["final_cost"] for i in similar["items"] if i.get("final_cost") and not i["is_open"]]
    cost = int(sorted(costs)[len(costs) // 2]) if costs else None
    causes, checks, safety, tools = SURVEY_CHECKS.get(category, (["Hao mòn trong quá trình sử dụng"], ["Kiểm tra trực quan hiện trạng"], ["Đảm bảo an toàn khu vực"], ["Dụng cụ cơ bản"]))
    immediate = cost is not None and cost < INTERNAL_APPROVAL_THRESHOLD
    return {
        "likely_causes": causes,
        "checks_on_site": checks,
        "safety_notes": safety,
        "parts_or_tools": tools,
        "can_repair_immediately": immediate,
        "recommended_action": "Sửa chữa nội bộ ngay sau khi xác định nguyên nhân" if immediate else "Báo về phòng CSVC để lập phương án",
        "estimated_cost": cost,
        "estimated_time": "Trong ngày" if immediate else "Theo phương án",
        "damage_level": "Nặng" if req.get("priority") in ("HIGH", "URGENT") else "Trung bình",
        "reasons": [f"Trung vị chi phí {len(costs)} ca tương tự: {vnd(cost)}" if cost else "Chưa có ca tương tự để ước tính chi phí"],
        "similar_cases": [i["code"] for i in similar["items"][:4]],
        "summary": f"Gợi ý khảo sát cho sự cố '{category_label(category)}'.",
        "confidence": 0.5,
    }


def acceptance_checklist(user, context, call_tool):
    req = context["request"]
    category = _category_of(context)
    plans = req.get("plans") or []
    plan = next((p for p in reversed(plans) if p["approval_status"] == "APPROVED"), plans[-1] if plans else {})
    previous = [r["remediation_notes"] for r in req.get("acceptance_records", []) if r["result"] == "FAIL" and r.get("remediation_notes")]
    contractor = (req.get("external_work") or {}).get("contractor") or ""
    perf = call_tool("get_contractor_performance", {"contractor": contractor}) if contractor else {"contractors": []}
    items = [f"Đối chiếu khối lượng thực hiện với phương án: {plan.get('title') or req['title']}"]
    items += [f"Kiểm tra lại nội dung đã yêu cầu khắc phục: {note}" for note in previous]
    items += SURVEY_CHECKS.get(category, ((), ["Vận hành thử thiết bị/khu vực sau sửa chữa"], (), ()))[1]
    items.append("Chụp ảnh hiện trạng sau thi công, thu hồi vật tư thay thế")
    note = ""
    for c in perf.get("contractors", []):
        if c["acceptance_fail"] or c["late_jobs"]:
            note = f"{c['contractor']} từng {c['acceptance_fail']} lần nghiệm thu không đạt, {c['late_jobs']} lần trễ hạn - kiểm tra kỹ."
    return {
        "check_items": items[:8],
        "pass_criteria": ["Thiết bị/khu vực vận hành bình thường khi chạy thử", "Không còn lỗi đã nêu ở lần nghiệm thu trước"],
        "focus_risks": previous[:3],
        "previous_failures": previous,
        "contractor_note": note,
        "similar_cases": [],
        "summary": f"Checklist nghiệm thu {len(items[:8])} hạng mục.",
        "confidence": 0.5,
    }


def contractor_suggest(user, context, call_tool):
    req = context["request"]
    category = _category_of(context)
    perf = call_tool("get_contractor_performance", {"category": category})
    recs = []
    for c in perf.get("contractors", []):
        score = 50 + min(c["jobs"], 5) * 6 - c["acceptance_fail"] * 15 - c["late_jobs"] * 10
        reasons = [f"Đã làm {c['jobs']} việc cùng lĩnh vực ({c['completed']} hoàn thành)."]
        concerns = []
        if c["acceptance_fail"]:
            concerns.append(f"{c['acceptance_fail']} lần nghiệm thu không đạt.")
        if c["late_jobs"]:
            concerns.append(f"{c['late_jobs']} lần trễ hạn.")
        if not concerns:
            reasons.append("Chưa ghi nhận nghiệm thu không đạt hay trễ hạn.")
        recs.append({"contractor": c["contractor"], "score": max(0, min(100, score)), "reasons": reasons, "concerns": concerns})
    recs.sort(key=lambda r: r["score"], reverse=True)
    return {
        "recommendations": recs[:3],
        "best_contractor": recs[0]["contractor"] if recs else None,
        "procurement_note": "Đưa điều khoản bảo hành và phạt chậm tiến độ vào hợp đồng; lấy tối thiểu 2 báo giá.",
        "summary": (f"Đề xuất {recs[0]['contractor']} cho lĩnh vực '{category_label(category)}'." if recs
                    else f"Chưa có nhà thầu từng làm lĩnh vực '{category_label(category)}', nên lấy báo giá cạnh tranh."),
        "confidence": 0.5,
    }


FALLBACKS = {
    "SURVEY_ASSIST": survey_assist,
    "ACCEPTANCE_CHECKLIST": acceptance_checklist,
    "CONTRACTOR": contractor_suggest,
    "TRIAGE": lambda u, c, t: triage(u, c, t, "TRIAGE"),
    "TRIAGE_PREVIEW": lambda u, c, t: triage(u, c, t, "TRIAGE_PREVIEW"),
    "ASSIGN_SURVEY": assign_survey,
    "PLAN": plan,
    "APPROVAL_BRIEF": approval_brief,
    "ASSIGN_INSPECTOR": assign_inspector,
    "CHAT": chat,
}
