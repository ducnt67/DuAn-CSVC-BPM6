"""Công cụ (function calling) của Trợ lý AI.

Mọi công cụ chỉ ĐỌC dữ liệu và luôn lọc theo quyền xem của người đang dùng
(`requests_visible_to`), nên AI không thể thấy nhiều hơn người dùng được phép thấy.
"""

import re
import statistics
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q
from django.utils import timezone

from core.ai.catalog import (
    ACTIVE_STATUSES,
    PRIORITY_LABELS,
    category_label,
    guess_category,
    staff_skills,
    strip_accents,
)
from core.models import (
    AcceptanceRecord,
    ExternalWork,
    Facility,
    RepairPlan,
    RepairPlanStatus,
    RequestStatus,
    Role,
    Survey,
    User,
)
from core.services import effective_inspector, requests_visible_to

STATUS_LABELS = dict(RequestStatus.choices)
STOPWORDS = {
    "bi", "va", "cua", "cac", "mot", "so", "can", "phong", "tang", "khu", "hoc", "da", "dang",
    "khong", "co", "duoc", "the", "nhieu", "lai", "de", "cho", "voi", "o", "tai", "trong", "yeu",
    "cau", "sua", "chua", "kiem", "tra", "thay", "moi",
}


def _money(value):
    if value is None:
        return None
    if isinstance(value, Decimal):
        return int(value)
    return int(value)


def _date(value):
    if not value:
        return None
    if hasattr(value, "date") and callable(value.date):
        return timezone.localtime(value).date().isoformat() if timezone.is_aware(value) else value.date().isoformat()
    return value.isoformat()


def _person(user):
    if not user:
        return None
    return {"code": user.code, "name": user.get_full_name() or user.username, "department": user.department}


def _tokens(text):
    words = re.findall(r"[a-z0-9]+", strip_accents(text))
    return {w for w in words if len(w) > 1 and w not in STOPWORDS}


def _request_category(req):
    if req.issue_category:
        return req.issue_category
    return guess_category(req.title, req.description, facility_type=req.facility_type)[0]


def _final_cost(req):
    plans = [p for p in req.repair_plans.all()]
    approved = [p for p in plans if p.approval_status == RepairPlanStatus.APPROVED]
    if approved:
        return _money(max(approved, key=lambda p: p.proposed_at).estimated_cost)
    return _money(req.estimated_cost)


def _duration_days(req):
    if req.completed_at and req.created_at:
        return round((req.completed_at - req.created_at).total_seconds() / 86400, 1)
    return None


def _get_visible_request(user, code):
    return (
        requests_visible_to(user)
        .select_related("facility", "assigned_staff", "acceptance_inspector", "requester")
        .prefetch_related("repair_plans", "external_works", "acceptance_records__inspector")
        .filter(code=str(code or "").strip().upper())
        .first()
    )


# ---------------------------------------------------------------------------
# 1. Chi tiết yêu cầu
# ---------------------------------------------------------------------------
def get_request_detail(user, code):
    req = _get_visible_request(user, code)
    if req is None:
        return {"error": f"Không tìm thấy yêu cầu {code} hoặc bạn không có quyền xem."}
    try:
        survey = req.survey
    except Survey.DoesNotExist:
        survey = None
    work = req.external_works.order_by("-created_at").first()
    inspector = effective_inspector(req)
    return {
        "code": req.code,
        "title": req.title,
        "description": req.description,
        "impact": req.impact,
        "facility": {"code": req.facility_code, "name": req.facility_name, "type": req.facility_type},
        "building": req.building,
        "location": req.location,
        "priority": req.priority,
        "priority_label": PRIORITY_LABELS.get(req.priority),
        "status": req.status,
        "status_label": STATUS_LABELS.get(req.status),
        "issue_category": req.issue_category or None,
        "issue_category_guess": _request_category(req),
        "requester": {"name": req.requester_name, "type": req.requester_type, "department": req.department},
        "created_at": _date(req.created_at),
        "age_days": round((timezone.now() - req.created_at).total_seconds() / 86400, 1),
        "assigned_staff": _person(req.assigned_staff),
        "acceptance_inspector": _person(req.acceptance_inspector) if req.acceptance_inspector_id else None,
        "inspector_note": (
            None if req.repair_type != "EXTERNAL" else
            "Đã phân công người nghiệm thu." if req.acceptance_inspector_id else
            f"Chưa phân công người nghiệm thu (bước này thực hiện sau khi duyệt; nếu không phân công thì mặc định là cán bộ khảo sát {inspector.get_full_name() if inspector else ''})."
        ),
        "repair_type": req.repair_type,
        "estimated_cost": _money(req.estimated_cost),
        "survey": None if survey is None else {
            "findings": survey.findings,
            "root_cause": survey.root_cause,
            "damage_level": survey.damage_level,
            "recommended_action": survey.recommended_action,
            "estimated_time": survey.estimated_time,
            "estimated_cost": _money(survey.estimated_cost),
            "surveyor": survey.surveyor.get_full_name() if survey.surveyor_id else None,
        },
        "plans": [
            {
                "code": p.code,
                "title": p.title,
                "repair_type": p.repair_type,
                "estimated_cost": _money(p.estimated_cost),
                "estimated_duration": p.estimated_duration,
                "materials": p.materials,
                "description": p.description,
                "approval_status": p.approval_status,
                "rejection_reason": p.rejection_reason or None,
            }
            for p in req.repair_plans.order_by("proposed_at")
        ],
        "external_work": None if work is None else {
            "contractor": work.contractor,
            "progress": work.progress,
            "status": work.status,
            "expected_end_date": _date(work.expected_end_date),
        },
        "acceptance_records": [
            {
                "date": _date(r.inspection_date),
                "result": r.result,
                "inspector": r.inspector.get_full_name(),
                "check_items": r.check_items,
                "remediation_notes": r.remediation_notes,
            }
            for r in req.acceptance_records.all()
        ],
        "supplement_note": req.supplement_note or None,
    }


# ---------------------------------------------------------------------------
# 2. Tìm ca tương tự / trùng lặp
# ---------------------------------------------------------------------------
def find_similar_requests(user, code=None, text="", facility_code="", facility_type="", category="", limit=8):
    limit = max(1, min(int(limit or 8), 15))
    reference = _get_visible_request(user, code) if code else None
    if reference is not None:
        text = f"{reference.title} {reference.description}"
        facility_code = reference.facility_code
        facility_type = reference.facility_type
        category = category or _request_category(reference)
        location = reference.location
        building = reference.building
    else:
        location = building = ""
        if not category and text:
            category = guess_category(text, facility_type=facility_type)[0]
    ref_tokens = _tokens(text)
    candidates = (
        requests_visible_to(user)
        .exclude(code=reference.code if reference else "")
        .prefetch_related("repair_plans", "acceptance_records")
        .order_by("-created_at")[:400]
    )
    scored = []
    for cand in candidates:
        score = 0.0
        same_facility = bool(facility_code) and cand.facility_code == facility_code
        if same_facility:
            score += 3
        if facility_type and cand.facility_type == facility_type:
            score += 1.5
        cand_category = _request_category(cand)
        if category and cand_category == category:
            score += 2
        cand_tokens = _tokens(f"{cand.title} {cand.description}")
        if ref_tokens and cand_tokens:
            overlap = len(ref_tokens & cand_tokens) / len(ref_tokens | cand_tokens)
            score += overlap * 6
        if location and cand.location == location and cand.building == building:
            score += 1
        if score >= 2.5:
            scored.append((score, cand, cand_category, same_facility))
    scored.sort(key=lambda item: item[0], reverse=True)
    items = []
    duplicates = []
    for score, cand, cand_category, same_facility in scored[:limit]:
        is_open = cand.status in ACTIVE_STATUSES
        accept = [r.result for r in cand.acceptance_records.all()]
        item = {
            "code": cand.code,
            "title": cand.title,
            "status": cand.status,
            "status_label": STATUS_LABELS.get(cand.status),
            "is_open": is_open,
            "priority": cand.priority,
            "category": cand_category,
            "facility": cand.facility_name,
            "location": f"{cand.location} ({cand.building})",
            "created_at": _date(cand.created_at),
            "repair_type": cand.repair_type,
            "final_cost": _final_cost(cand),
            "duration_days": _duration_days(cand),
            "acceptance_results": accept,
            "same_facility": same_facility,
            "similarity": round(score, 2),
        }
        items.append(item)
        recent = cand.created_at >= timezone.now() - timedelta(days=30)
        if is_open and recent and (same_facility or score >= 6):
            duplicates.append({"code": cand.code, "title": cand.title, "status_label": item["status_label"]})
    return {
        "reference_category": category or None,
        "count": len(items),
        "items": items,
        "possible_duplicates": duplicates,
    }


# ---------------------------------------------------------------------------
# 3. Khối lượng công việc & chuyên môn cán bộ
# ---------------------------------------------------------------------------
def list_staff_workload(user, category="", exclude_code=None):
    staff_members = User.objects.filter(role=Role.STAFF, is_active=True).order_by("last_name", "first_name")
    result = []
    for staff in staff_members:
        active = (
            requests_visible_to(user)
            .filter(Q(assigned_staff=staff) | Q(acceptance_inspector=staff), status__in=ACTIVE_STATUSES)
            .exclude(code=exclude_code or "")
            .distinct()
        )
        active_list = list(active.values("code", "status", "priority")[:6])
        completed = requests_visible_to(user).filter(assigned_staff=staff, status=RequestStatus.COMPLETED)
        completed_same = 0
        durations = []
        for req in completed.only("title", "description", "facility_type", "issue_category", "created_at", "completed_at"):
            if category and _request_category(req) == category:
                completed_same += 1
            if req.completed_at:
                durations.append((req.completed_at - req.created_at).total_seconds() / 86400)
        inspections = AcceptanceRecord.objects.filter(inspector=staff)
        skills = staff_skills(staff)
        result.append({
            "code": staff.code,
            "name": staff.get_full_name() or staff.username,
            "department": staff.department,
            "skills": skills,
            "skill_labels": [category_label(s) for s in skills],
            "matches_category": bool(category) and category in skills,
            "active_tasks": active.count(),
            "active_urgent": active.filter(priority__in=["HIGH", "URGENT"]).count(),
            "active_list": active_list,
            "completed_total": completed.count(),
            "completed_same_category": completed_same if category else None,
            "avg_completion_days": round(statistics.mean(durations), 1) if durations else None,
            "inspections_done": inspections.count(),
            "inspections_found_issues": inspections.filter(result="FAIL").count(),
        })
    return {"category": category or None, "staff": result}


# ---------------------------------------------------------------------------
# 4. Lịch sử thiết bị / cơ sở vật chất
# ---------------------------------------------------------------------------
def get_facility_history(user, facility_code):
    facility = Facility.objects.filter(code=str(facility_code or "").strip().upper()).first()
    if facility is None:
        return {"error": f"Không tìm thấy CSVC {facility_code}."}
    reqs = list(
        requests_visible_to(user)
        .filter(facility_code=facility.code)
        .prefetch_related("repair_plans")
        .order_by("-created_at")[:20]
    )
    since = timezone.now() - timedelta(days=180)
    recent = [r for r in reqs if r.created_at >= since]
    total_cost = sum(c for c in (_final_cost(r) for r in reqs) if c)
    return {
        "facility": {
            "code": facility.code, "name": facility.name, "type": facility.facility_type,
            "building": facility.building, "location": facility.location, "status": facility.status,
        },
        "total_requests": len(reqs),
        "requests_last_180_days": len(recent),
        "open_requests": sum(1 for r in reqs if r.status in ACTIVE_STATUSES),
        "total_repair_cost": total_cost,
        "recurring_issue": len(recent) >= 2,
        "items": [
            {
                "code": r.code, "title": r.title, "status_label": STATUS_LABELS.get(r.status),
                "created_at": _date(r.created_at), "repair_type": r.repair_type, "cost": _final_cost(r),
            }
            for r in reqs[:10]
        ],
    }


# ---------------------------------------------------------------------------
# 5. Thống kê chi phí
# ---------------------------------------------------------------------------
def get_cost_statistics(user, category="", facility_type="", repair_type=""):
    reqs = requests_visible_to(user).filter(
        repair_plans__approval_status=RepairPlanStatus.APPROVED
    ).distinct().prefetch_related("repair_plans")
    if facility_type:
        reqs = reqs.filter(facility_type=facility_type)
    if repair_type:
        reqs = reqs.filter(repair_type=repair_type)
    rows = []
    for req in reqs[:500]:
        if category and _request_category(req) != category:
            continue
        cost = _final_cost(req)
        if cost is None:
            continue
        rows.append((req, cost))
    costs = [c for _, c in rows]
    by_type = {}
    for req, cost in rows:
        by_type.setdefault(req.repair_type or "UNKNOWN", []).append(cost)
    durations = [d for d in (_duration_days(r) for r, _ in rows) if d is not None]
    plans = RepairPlan.objects.filter(request__in=requests_visible_to(user))
    if category:
        plans = [p for p in plans.select_related("request") if _request_category(p.request) == category]
        total_plans = len(plans)
        rejected = sum(1 for p in plans if p.approval_status == RepairPlanStatus.REJECTED)
    else:
        total_plans = plans.count()
        rejected = plans.filter(approval_status=RepairPlanStatus.REJECTED).count()
    return {
        "filters": {"category": category or None, "facility_type": facility_type or None, "repair_type": repair_type or None},
        "sample_size": len(costs),
        "avg_cost": int(statistics.mean(costs)) if costs else None,
        "median_cost": int(statistics.median(costs)) if costs else None,
        "min_cost": min(costs) if costs else None,
        "max_cost": max(costs) if costs else None,
        "by_repair_type": {
            key: {"count": len(vals), "avg_cost": int(statistics.mean(vals))} for key, vals in by_type.items()
        },
        "avg_completion_days": round(statistics.mean(durations), 1) if durations else None,
        "plan_rejection_rate": round(rejected / total_plans, 2) if total_plans else None,
        "sample_codes": [r.code for r, _ in rows[:8]],
    }


# ---------------------------------------------------------------------------
# 6. Năng lực nhà thầu
# ---------------------------------------------------------------------------
def get_contractor_performance(user, contractor="", category=""):
    works = ExternalWork.objects.filter(request__in=requests_visible_to(user)).exclude(contractor="")
    if contractor:
        works = works.filter(contractor__icontains=contractor)
    stats = {}
    for work in works.select_related("request"):
        if category and _request_category(work.request) != category:
            continue
        entry = stats.setdefault(work.contractor, {"jobs": 0, "completed": 0, "acceptance_fail": 0, "late_jobs": 0, "codes": []})
        entry["jobs"] += 1
        entry["codes"].append(work.request.code)
        if work.request.status == RequestStatus.COMPLETED:
            entry["completed"] += 1
        entry["acceptance_fail"] += AcceptanceRecord.objects.filter(request=work.request, result="FAIL").count()
        if work.expected_end_date and work.actual_end_date and work.actual_end_date > work.expected_end_date:
            entry["late_jobs"] += 1
    return {
        "contractors": [
            {"contractor": name, **values, "codes": values["codes"][:6]}
            for name, values in sorted(stats.items(), key=lambda kv: -kv[1]["jobs"])
        ][:12]
    }


# ---------------------------------------------------------------------------
# 7. Tìm kiếm yêu cầu (cho hỏi đáp)
# ---------------------------------------------------------------------------
def search_requests(user, status="", priority="", building="", category="", text="", created_within_days=None, limit=15):
    limit = max(1, min(int(limit or 15), 30))
    qs = requests_visible_to(user).prefetch_related("repair_plans")
    if status:
        statuses = [s.strip().upper() for s in str(status).split(",") if s.strip()]
        if statuses == ["OPEN"]:
            qs = qs.filter(status__in=ACTIVE_STATUSES)
        else:
            qs = qs.filter(status__in=statuses)
    if priority:
        qs = qs.filter(priority__in=[p.strip().upper() for p in str(priority).split(",")])
    if building:
        qs = qs.filter(building__icontains=building)
    if created_within_days:
        qs = qs.filter(created_at__gte=timezone.now() - timedelta(days=int(created_within_days)))
    if text:
        qs = qs.filter(Q(title__icontains=text) | Q(description__icontains=text) | Q(facility_name__icontains=text) | Q(code__icontains=text))
    rows = []
    for req in qs.order_by("-created_at")[:300]:
        if category and _request_category(req) != category:
            continue
        rows.append(req)
    return {
        "count": len(rows),
        "items": [
            {
                "code": r.code, "title": r.title, "status_label": STATUS_LABELS.get(r.status),
                "priority": r.priority, "building": r.building, "location": r.location,
                "category": _request_category(r), "created_at": _date(r.created_at),
                "cost": _final_cost(r),
            }
            for r in rows[:limit]
        ],
    }


# ---------------------------------------------------------------------------
# 8. Tổng quan
# ---------------------------------------------------------------------------
def get_overview_stats(user, building="", days=None):
    qs = requests_visible_to(user)
    if building:
        qs = qs.filter(building__icontains=building)
    if days:
        qs = qs.filter(created_at__gte=timezone.now() - timedelta(days=int(days)))
    by_status = {STATUS_LABELS.get(row["status"], row["status"]): row["n"] for row in qs.values("status").annotate(n=Count("id"))}
    by_priority = {row["priority"]: row["n"] for row in qs.values("priority").annotate(n=Count("id"))}
    by_building = {row["building"]: row["n"] for row in qs.values("building").annotate(n=Count("id"))}
    open_qs = qs.filter(status__in=ACTIVE_STATUSES)
    completed = [r for r in qs.filter(status=RequestStatus.COMPLETED).only("created_at", "completed_at") if r.completed_at]
    pending = qs.filter(status=RequestStatus.WAITING_FOR_APPROVAL)
    return {
        "scope": {"building": building or "Tất cả", "days": days},
        "total": qs.count(),
        "open": open_qs.count(),
        "open_urgent": list(open_qs.filter(priority__in=["HIGH", "URGENT"]).values("code", "title", "priority")[:10]),
        "by_status": by_status,
        "by_priority": by_priority,
        "by_building": by_building,
        "pending_approval": {"count": pending.count(), "total_cost": sum(_money(r.estimated_cost) or 0 for r in pending)},
        "overdue_remediation": qs.filter(status=RequestStatus.OVERDUE_REMEDIATION).count(),
        "avg_resolution_days": round(statistics.mean((r.completed_at - r.created_at).total_seconds() / 86400 for r in completed), 1) if completed else None,
    }


# ---------------------------------------------------------------------------
# Khai báo cho Gemini + tóm tắt hiển thị "AI đã tra cứu"
# ---------------------------------------------------------------------------
CATEGORY_ENUM = ["ELECTRICAL", "HVAC", "PLUMBING", "NETWORK_IT", "AV_EQUIPMENT", "FURNITURE", "BUILDING", "SANITATION", "OTHER"]

TOOLS = {
    "get_request_detail": {
        "fn": get_request_detail,
        "label": "Chi tiết yêu cầu",
        "declaration": {
            "name": "get_request_detail",
            "description": "Lấy toàn bộ hồ sơ một yêu cầu sửa chữa: mô tả, CSVC, mức độ, khảo sát, phương án, thuê ngoài, nghiệm thu.",
            "parameters": {"type": "object", "properties": {"code": {"type": "string", "description": "Mã yêu cầu, ví dụ YC-9004"}}, "required": ["code"]},
        },
        "summary": lambda r: r.get("error") or f"{r['code']}: {r['title']} ({r['status_label']})",
    },
    "find_similar_requests": {
        "fn": find_similar_requests,
        "label": "Tìm ca tương tự",
        "declaration": {
            "name": "find_similar_requests",
            "description": "Tìm các yêu cầu tương tự trong lịch sử (cùng thiết bị, cùng loại sự cố, mô tả giống) kèm chi phí, thời gian xử lý, kết quả nghiệm thu; đồng thời phát hiện yêu cầu trùng đang mở.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Mã yêu cầu tham chiếu (nếu có)"},
                    "text": {"type": "string", "description": "Mô tả sự cố khi chưa có mã"},
                    "facility_code": {"type": "string"},
                    "facility_type": {"type": "string"},
                    "category": {"type": "string", "enum": CATEGORY_ENUM},
                    "limit": {"type": "integer"},
                },
            },
        },
        "summary": lambda r: f"{r['count']} ca tương tự" + (f", {len(r['possible_duplicates'])} có thể trùng" if r["possible_duplicates"] else ""),
    },
    "list_staff_workload": {
        "fn": list_staff_workload,
        "label": "Khối lượng & chuyên môn cán bộ",
        "declaration": {
            "name": "list_staff_workload",
            "description": "Liệt kê cán bộ kỹ thuật: tổ chuyên môn, kỹ năng, số việc đang xử lý (kể cả khẩn), kinh nghiệm với loại sự cố, số lần nghiệm thu.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": CATEGORY_ENUM, "description": "Loại sự cố để đối chiếu chuyên môn"},
                    "exclude_code": {"type": "string", "description": "Mã yêu cầu hiện tại, không tính vào khối lượng"},
                },
            },
        },
        "summary": lambda r: f"{len(r['staff'])} cán bộ, đang có tổng {sum(s['active_tasks'] for s in r['staff'])} việc",
    },
    "get_facility_history": {
        "fn": get_facility_history,
        "label": "Lịch sử thiết bị",
        "declaration": {
            "name": "get_facility_history",
            "description": "Lịch sử sửa chữa của một CSVC/thiết bị: số lần hỏng, lần gần nhất, tổng chi phí, có lặp lại không.",
            "parameters": {"type": "object", "properties": {"facility_code": {"type": "string", "description": "Mã CSVC, ví dụ CSVC-006"}}, "required": ["facility_code"]},
        },
        "summary": lambda r: r.get("error") or f"{r['facility']['name']}: {r['total_requests']} lần sửa, {r['requests_last_180_days']} lần trong 180 ngày",
    },
    "get_cost_statistics": {
        "fn": get_cost_statistics,
        "label": "Thống kê chi phí",
        "declaration": {
            "name": "get_cost_statistics",
            "description": "Thống kê chi phí các phương án đã duyệt (trung bình, trung vị, min, max) theo loại sự cố / loại CSVC / hình thức sửa; tỉ lệ phương án bị từ chối.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": CATEGORY_ENUM},
                    "facility_type": {"type": "string"},
                    "repair_type": {"type": "string", "enum": ["INTERNAL", "EXTERNAL"]},
                },
            },
        },
        "summary": lambda r: f"{r['sample_size']} phương án, TB {r['avg_cost']:,}đ".replace(",", ".") if r["avg_cost"] else "Chưa có dữ liệu chi phí",
    },
    "get_contractor_performance": {
        "fn": get_contractor_performance,
        "label": "Năng lực nhà thầu",
        "declaration": {
            "name": "get_contractor_performance",
            "description": "Hiệu quả các đơn vị thi công thuê ngoài: số việc, hoàn thành, số lần nghiệm thu không đạt, trễ hạn.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contractor": {"type": "string", "description": "Tên (một phần) đơn vị thi công"},
                    "category": {"type": "string", "enum": CATEGORY_ENUM, "description": "Chỉ tính các việc thuộc loại sự cố này"},
                },
            },
        },
        "summary": lambda r: f"{len(r['contractors'])} đơn vị thi công",
    },
    "search_requests": {
        "fn": search_requests,
        "label": "Tìm kiếm yêu cầu",
        "declaration": {
            "name": "search_requests",
            "description": "Tìm yêu cầu theo trạng thái (mã trạng thái, hoặc OPEN = đang mở), mức độ, tòa nhà, loại sự cố, từ khóa, số ngày gần đây.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "VD: OPEN, COMPLETED, WAITING_FOR_APPROVAL (nhiều giá trị cách nhau dấu phẩy)"},
                    "priority": {"type": "string", "description": "LOW, MEDIUM, HIGH, URGENT"},
                    "building": {"type": "string", "description": "VD: Khu C"},
                    "category": {"type": "string", "enum": CATEGORY_ENUM},
                    "text": {"type": "string"},
                    "created_within_days": {"type": "integer"},
                    "limit": {"type": "integer"},
                },
            },
        },
        "summary": lambda r: f"{r['count']} yêu cầu khớp",
    },
    "get_overview_stats": {
        "fn": get_overview_stats,
        "label": "Tổng quan hệ thống",
        "declaration": {
            "name": "get_overview_stats",
            "description": "Số liệu tổng quan: theo trạng thái, mức độ, tòa nhà; việc khẩn đang mở; chờ duyệt; quá hạn khắc phục; thời gian xử lý TB.",
            "parameters": {"type": "object", "properties": {"building": {"type": "string"}, "days": {"type": "integer", "description": "Chỉ tính yêu cầu tạo trong N ngày gần đây"}}},
        },
        "summary": lambda r: f"{r['total']} yêu cầu, {r['open']} đang mở",
    },
}


def declarations(names):
    return [TOOLS[name]["declaration"] for name in names]


def run_tool(user, name, args, allowed):
    if name not in allowed or name not in TOOLS:
        return {"error": f"Công cụ {name} không được phép dùng trong tác vụ này."}
    clean = {k: v for k, v in (args or {}).items() if v not in (None, "")}
    try:
        return TOOLS[name]["fn"](user, **clean)
    except TypeError as error:
        return {"error": f"Tham số không hợp lệ cho {name}: {error}"}


def summarize(name, result):
    try:
        return TOOLS[name]["summary"](result)
    except Exception:  # noqa: BLE001 - tóm tắt chỉ để hiển thị
        return "Đã tra cứu"
