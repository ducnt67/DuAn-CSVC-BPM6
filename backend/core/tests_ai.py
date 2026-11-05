"""Kiểm thử Trợ lý AI: bộ luật dự phòng, vòng lặp agent (Gemini giả lập), phân quyền,
đối chiếu quyết định và bước phân công người nghiệm thu."""

import json
from unittest import mock

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from core.ai import agent as agent_module
from core.models import (
    AISuggestion,
    AISuggestionStatus,
    ExternalWork,
    ExternalWorkStatus,
    Facility,
    RepairPlan,
    RepairPlanStatus,
    RepairRequest,
    RepairType,
    RequestStatus,
    Role,
    Survey,
    User,
)


@override_settings(GEMINI_API_KEY="")
class AIAgentTests(APITestCase):
    def setUp(self):
        self.requester = self.make_user("requester", Role.REQUESTER, "Khoa QTKD")
        self.admin = self.make_user("admin", Role.FACILITY_ADMIN, "Phòng CSVC")
        self.director = self.make_user("director", Role.DIRECTOR, "BGH")
        self.electrician = self.make_user("dien", Role.STAFF, "Tổ Điện - Điện lạnh")
        self.it_staff = self.make_user("cntt", Role.STAFF, "Tổ CNTT - Mạng & Thiết bị trình chiếu")
        self.facility = Facility.objects.create(
            code="CSVC-100", name="Phòng máy E301", facility_type="Phòng máy tính", building="Khu E", location="Tầng 3"
        )

    def make_user(self, username, role, department):
        return User.objects.create_user(
            username=username, password="SecurePass123!", first_name=username,
            role=role, code=f"U-{username}", department=department,
        )

    def make_request(self, **kwargs):
        defaults = {
            "title": "Ổ điện có mùi khét",
            "description": "Ổ điện bàn số 5 có mùi khét và tia lửa khi cắm sạc.",
            "building": "Khu E",
            "location": "Tầng 3, Phòng 301",
            "facility": self.facility,
            "facility_code": self.facility.code,
            "facility_name": self.facility.name,
            "facility_type": self.facility.facility_type,
            "requester": self.requester,
            "requester_name": "Người gửi",
            "priority": "LOW",
            "status": RequestStatus.NEW,
        }
        defaults.update(kwargs)
        return RepairRequest.objects.create(**defaults)

    def post_as(self, user, path, data=None):
        self.client.force_authenticate(user)
        return self.client.post(path, data or {}, format="json")

    # ------------------------------------------------------------------
    def test_triage_fallback_raises_priority_for_safety_risk_and_records_decision(self):
        obj = self.make_request()
        response = self.post_as(self.admin, f"/api/v1/requests/{obj.code}/ai/triage/")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["source"], "rule")
        self.assertEqual(response.data["output"]["priority"], "URGENT")
        self.assertEqual(response.data["output"]["category"], "ELECTRICAL")
        self.assertTrue(response.data["output"]["safety_risk"])
        self.assertTrue(any(step["tool"] == "find_similar_requests" for step in response.data["toolTrace"]))

        applied = self.post_as(
            self.admin, f"/api/v1/requests/{obj.code}/triage/", {"priority": "URGENT", "issueCategory": "ELECTRICAL"}
        )
        self.assertEqual(applied.status_code, 200, applied.data)
        obj.refresh_from_db()
        self.assertEqual((obj.priority, obj.issue_category), ("URGENT", "ELECTRICAL"))
        suggestion = AISuggestion.objects.get(pk=response.data["id"])
        self.assertEqual(suggestion.status, AISuggestionStatus.ACCEPTED)

    def test_duplicate_open_request_is_flagged(self):
        self.make_request(title="Ổ điện bàn 5 phòng E301 khét", status=RequestStatus.SURVEYING)
        obj = self.make_request()
        response = self.post_as(self.admin, f"/api/v1/requests/{obj.code}/ai/triage/")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["output"]["possible_duplicates"])

    def test_assign_survey_prefers_matching_skill_and_evaluates_override(self):
        obj = self.make_request(
            title="Wifi tầng 3 chập chờn", description="Mất kết nối wifi liên tục", status=RequestStatus.ACCEPTED,
            issue_category="NETWORK_IT", priority="HIGH",
        )
        response = self.post_as(self.admin, f"/api/v1/requests/{obj.code}/ai/assign-survey/")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["output"]["best_staff_code"], self.it_staff.code)

        assigned = self.post_as(self.admin, f"/api/v1/requests/{obj.code}/assign/", {"staffId": self.electrician.code})
        self.assertEqual(assigned.status_code, 200)
        suggestion = AISuggestion.objects.get(pk=response.data["id"])
        self.assertEqual(suggestion.status, AISuggestionStatus.MODIFIED)
        self.assertEqual(suggestion.final_value["staff_code"], self.electrician.code)

    def test_ai_endpoints_enforce_role_and_status(self):
        obj = self.make_request()
        self.assertEqual(self.post_as(self.requester, f"/api/v1/requests/{obj.code}/ai/triage/").status_code, 403)
        self.assertEqual(self.post_as(self.director, f"/api/v1/requests/{obj.code}/ai/approval-brief/").status_code, 400)
        self.assertEqual(self.post_as(self.admin, f"/api/v1/requests/{obj.code}/ai/plan/").status_code, 400)
        self.assertEqual(self.post_as(self.admin, f"/api/v1/requests/{obj.code}/ai/unknown/").status_code, 400)

    def test_approval_brief_flags_cost_overrun_and_tracks_director_decision(self):
        obj = self.make_request(
            title="Thay mới điều hòa", description="Điều hòa hỏng nhiều lần", status=RequestStatus.WAITING_FOR_APPROVAL,
            assigned_staff=self.electrician, repair_type=RepairType.EXTERNAL, estimated_cost=45000000, priority="HIGH",
        )
        Survey.objects.create(
            request=obj, survey_date=timezone.now(), findings="Máy cũ", root_cause="Hết tuổi thọ",
            estimated_cost=30000000, surveyor=self.electrician,
        )
        RepairPlan.objects.create(
            request=obj, title="Mua mới 2 máy", repair_type=RepairType.EXTERNAL, estimated_cost=45000000,
            proposed_by=self.admin, requires_approval=True, approval_status=RepairPlanStatus.PENDING,
        )
        response = self.post_as(self.director, f"/api/v1/requests/{obj.code}/ai/approval-brief/")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["output"]["recommendation"], "REVISE")
        self.assertTrue(response.data["output"]["suggested_rejection_reason"])

        approved = self.post_as(self.director, f"/api/v1/requests/{obj.code}/approve/")
        self.assertEqual(approved.status_code, 200)
        suggestion = AISuggestion.objects.get(pk=response.data["id"])
        self.assertEqual(suggestion.status, AISuggestionStatus.REJECTED)

    def test_assign_inspector_moves_acceptance_rights(self):
        obj = self.make_request(
            title="Sửa máy chiếu", description="Máy chiếu không lên hình", status=RequestStatus.WAITING_FOR_ACCEPTANCE,
            assigned_staff=self.electrician, repair_type=RepairType.EXTERNAL, priority="MEDIUM",
        )
        ExternalWork.objects.create(request=obj, title="Sửa máy chiếu", contractor="NCC A", progress=100, status=ExternalWorkStatus.WAITING_ACCEPTANCE)
        suggestion = self.post_as(self.admin, f"/api/v1/requests/{obj.code}/ai/assign-inspector/")
        self.assertEqual(suggestion.status_code, 201, suggestion.data)
        self.assertEqual(suggestion.data["output"]["best_staff_code"], self.it_staff.code)

        assigned = self.post_as(self.admin, f"/api/v1/requests/{obj.code}/assign-inspector/", {"staffId": self.it_staff.code})
        self.assertEqual(assigned.status_code, 200, assigned.data)
        self.assertEqual(assigned.data["acceptanceInspectorId"], self.it_staff.code)

        payload = {"result": "PASS", "checkItems": "Kiểm tra hình ảnh"}
        self.assertEqual(self.post_as(self.electrician, f"/api/v1/requests/{obj.code}/acceptance/", payload).status_code, 403)
        self.assertEqual(self.post_as(self.it_staff, f"/api/v1/requests/{obj.code}/acceptance/", payload).status_code, 200)
        self.assertEqual(self.post_as(self.it_staff, f"/api/v1/requests/{obj.code}/confirm/").status_code, 200)
        obj.refresh_from_db()
        self.assertEqual(obj.status, RequestStatus.COMPLETED)
        self.assertEqual(AISuggestion.objects.get(pk=suggestion.data["id"]).status, AISuggestionStatus.ACCEPTED)

    def test_triage_preview_links_to_created_request(self):
        preview = self.post_as(
            self.requester, "/api/v1/ai/triage-preview/",
            {"title": "Ổ điện khét", "description": "Có tia lửa khi cắm sạc", "facilityId": self.facility.code},
        )
        self.assertEqual(preview.status_code, 201, preview.data)
        self.assertEqual(preview.data["output"]["priority"], "URGENT")
        created = self.post_as(self.requester, "/api/v1/requests/", {
            "title": "Ổ điện khét", "description": "Có tia lửa khi cắm sạc", "building": "Khu E",
            "location": "Tầng 3", "priority": "URGENT", "facilityId": self.facility.code,
            "aiSuggestionId": preview.data["id"], "attachments": [],
        })
        self.assertEqual(created.status_code, 201, created.data)
        suggestion = AISuggestion.objects.get(pk=preview.data["id"])
        self.assertEqual(suggestion.status, AISuggestionStatus.ACCEPTED)
        self.assertEqual(suggestion.request.code, created.data["id"])

    def test_stats_and_chat_fallback(self):
        obj = self.make_request()
        self.post_as(self.admin, f"/api/v1/requests/{obj.code}/ai/triage/")
        self.post_as(self.admin, f"/api/v1/requests/{obj.code}/triage/", {"priority": "HIGH", "issueCategory": "ELECTRICAL"})
        chat = self.post_as(self.admin, "/api/v1/ai/chat/", {"message": "Có bao nhiêu yêu cầu đang mở?"})
        self.assertEqual(chat.status_code, 201)
        self.assertIn("đang mở", chat.data["output"]["answer"])
        self.client.force_authenticate(self.admin)
        stats = self.client.get("/api/v1/ai/stats/").data
        self.assertEqual(stats["decided"], 1)
        self.assertEqual(stats["modified"], 1)
        self.client.force_authenticate(self.requester)
        self.assertEqual(self.client.get("/api/v1/ai/stats/").status_code, 403)


def _fake_content(parts):
    return {"role": "model", "parts": parts}


@override_settings(GEMINI_API_KEY="test-key", GEMINI_MODELS=["fake-model"])
class AgentLoopTests(APITestCase):
    """Giả lập Gemini để kiểm tra vòng lặp gọi công cụ mà không cần mạng."""

    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="x", role=Role.FACILITY_ADMIN, code="U-admin")
        self.staff = User.objects.create_user(username="nuoc", password="x", role=Role.STAFF, code="U-nuoc", department="Tổ Cấp thoát nước")
        requester = User.objects.create_user(username="req", password="x", role=Role.REQUESTER, code="U-req")
        self.obj = RepairRequest.objects.create(
            title="Vòi nước rò rỉ", description="Vòi lavabo chảy liên tục", building="Khu A", location="Tầng 1",
            requester=requester, requester_name="Req", status=RequestStatus.ACCEPTED,
        )

    def _run(self, final_json):
        responses = iter([
            (_fake_content([{"functionCall": {"name": "list_staff_workload", "args": {"category": "PLUMBING"}}, "thoughtSignature": "sig"}]), "fake-model"),
            (_fake_content([{"text": json.dumps(final_json)}]), "fake-model"),
        ])
        calls = []

        def fake_generate(contents, *args, **kwargs):
            calls.append(json.loads(json.dumps(contents)))
            return next(responses)

        with mock.patch.object(agent_module.gemini, "generate", side_effect=fake_generate):
            result = agent_module.run_agent("ASSIGN_SURVEY", self.admin, request_obj=self.obj)
        return result, calls

    def test_agent_executes_tool_calls_and_keeps_thought_signature(self):
        result, calls = self._run({
            "recommendations": [{"staff_code": self.staff.code, "score": 92, "reasons": ["Đúng tổ nước"]}],
            "best_staff_code": self.staff.code, "summary": "Giao tổ nước", "confidence": 0.9,
        })
        self.assertEqual(result.source, "gemini")
        self.assertEqual(result.output["best_staff_code"], self.staff.code)
        self.assertEqual([t["by"] for t in result.trace], ["system", "agent"])
        second_call = calls[1]
        self.assertEqual(second_call[1]["parts"][0]["thoughtSignature"], "sig")
        self.assertIn("functionResponse", second_call[2]["parts"][0])

    def test_hallucinated_staff_falls_back_to_rules(self):
        result, _ = self._run({"recommendations": [{"staff_code": "U-khong-ton-tai", "score": 99}], "best_staff_code": "U-khong-ton-tai"})
        self.assertEqual(result.source, "rule")
        self.assertIn("Không có cán bộ hợp lệ", result.error)
        self.assertEqual(result.output["best_staff_code"], self.staff.code)


@override_settings(GEMINI_API_KEY="test-key", GEMINI_MODELS=["fake-model"])
class GroundingTests(APITestCase):
    """Mô hình không tra cứu mà bịa số -> bị nhắc dùng công cụ, số liệu bị hệ thống tính lại."""

    def test_fabricated_numbers_are_replaced_and_agent_is_nudged(self):
        director = User.objects.create_user(username="bgh", password="x", role=Role.DIRECTOR, code="U-bgh")
        admin = User.objects.create_user(username="qt", password="x", role=Role.FACILITY_ADMIN, code="U-qt")
        staff = User.objects.create_user(username="kt", password="x", role=Role.STAFF, code="U-kt")
        requester = User.objects.create_user(username="nyc", password="x", role=Role.REQUESTER, code="U-nyc")
        obj = RepairRequest.objects.create(
            title="Thay mới điều hòa", description="Hỏng nhiều lần", building="Khu C", location="P202",
            requester=requester, requester_name="N", status=RequestStatus.WAITING_FOR_APPROVAL,
            repair_type=RepairType.EXTERNAL, estimated_cost=45000000, assigned_staff=staff,
        )
        Survey.objects.create(request=obj, survey_date=timezone.now(), findings="Cũ", root_cause="Hết tuổi thọ", estimated_cost=30000000, surveyor=staff)
        RepairPlan.objects.create(request=obj, title="Mua mới", repair_type=RepairType.EXTERNAL, estimated_cost=45000000, proposed_by=admin, requires_approval=True)
        fabricated = {
            "recommendation": "APPROVE", "summary": "Ổn",
            "cost_assessment": {"plan_cost": 1, "survey_cost": 2, "similar_avg": 32000000, "deviation_pct": 0, "verdict": "Hợp lý"},
            "similar_cases": ["YC-0000"],
        }
        responses = iter([
            (_fake_content([{"text": json.dumps(fabricated)}]), "fake-model"),
            (_fake_content([{"text": json.dumps(fabricated)}]), "fake-model"),
        ])
        calls = []

        def fake_generate(contents, *args, **kwargs):
            calls.append(json.loads(json.dumps(contents)))
            return next(responses)

        with mock.patch.object(agent_module.gemini, "generate", side_effect=fake_generate):
            result = agent_module.run_agent("APPROVAL_BRIEF", director, request_obj=obj)
        self.assertEqual(result.source, "gemini")
        self.assertIn("Bạn chưa tra cứu dữ liệu", calls[1][-1]["parts"][0]["text"])
        cost = result.output["cost_assessment"]
        self.assertEqual((cost["plan_cost"], cost["survey_cost"], cost["similar_avg"]), (45000000, 30000000, None))
        self.assertEqual(cost["deviation_pct"], 50)
        self.assertEqual(result.output["similar_cases"], [])
        self.assertEqual(result.trace[-1]["by"], "verify")


@override_settings(GEMINI_API_KEY="")
class StaffAndProcurementAITests(APITestCase):
    """AI cho cán bộ kỹ thuật (khảo sát, checklist nghiệm thu) và BP Mua sắm (chọn nhà thầu)."""

    make_user = AIAgentTests.make_user
    make_request = AIAgentTests.make_request
    post_as = AIAgentTests.post_as

    def setUp(self):
        AIAgentTests.setUp(self)
        self.procurement = self.make_user("muasam", Role.PROCUREMENT, "BP Mua sắm")

    def test_survey_assist_only_for_assigned_staff_and_tracks_decision(self):
        obj = self.make_request(status=RequestStatus.SURVEYING, assigned_staff=self.electrician, issue_category="ELECTRICAL")
        self.assertEqual(self.post_as(self.it_staff, f"/api/v1/requests/{obj.code}/ai/survey-assist/").status_code, 404)
        response = self.post_as(self.electrician, f"/api/v1/requests/{obj.code}/ai/survey-assist/")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["output"]["checks_on_site"])
        survey = self.post_as(self.electrician, f"/api/v1/requests/{obj.code}/survey/", {
            "findings": "Ổ cắm cháy xém", "rootCause": "Quá tải", "repairAction": "REPORT_TO_FACILITY",
        })
        self.assertEqual(survey.status_code, 200, survey.data)
        suggestion = AISuggestion.objects.get(pk=response.data["id"])
        self.assertNotEqual(suggestion.status, AISuggestionStatus.PENDING)

    def test_contractor_suggestion_prefers_clean_track_record(self):
        for index, (name, fail) in enumerate((("NCC Tốt", False), ("NCC Kém", True))):
            done = self.make_request(
                title="Sửa điều hòa", description="Điều hòa không mát", status=RequestStatus.COMPLETED,
                repair_type=RepairType.EXTERNAL, issue_category="HVAC", assigned_staff=self.electrician,
            )
            ExternalWork.objects.create(request=done, title="x", contractor=name, progress=100, status=ExternalWorkStatus.COMPLETED)
            if fail:
                done.acceptance_records.create(inspection_date=timezone.localdate(), inspector=self.electrician, check_items="x", result="FAIL")
        obj = self.make_request(
            title="Thay block điều hòa", description="Điều hòa hỏng block", status=RequestStatus.WAITING_FOR_EXTERNAL_WORK,
            repair_type=RepairType.EXTERNAL, issue_category="HVAC", assigned_staff=self.electrician,
        )
        ExternalWork.objects.create(request=obj, title="Thay block", status=ExternalWorkStatus.PENDING)
        response = self.post_as(self.procurement, f"/api/v1/requests/{obj.code}/ai/contractor/")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["output"]["best_contractor"], "NCC Tốt")
        updated = self.post_as(self.procurement, f"/api/v1/requests/{obj.code}/update-external-work/", {"contractor": "NCC Tốt", "progress": 10})
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(AISuggestion.objects.get(pk=response.data["id"]).status, AISuggestionStatus.ACCEPTED)

    def test_acceptance_checklist_reuses_previous_failures(self):
        obj = self.make_request(
            title="Đi lại cáp mạng", description="Mạng chập chờn", status=RequestStatus.WAITING_FOR_ACCEPTANCE,
            repair_type=RepairType.EXTERNAL, issue_category="NETWORK_IT", assigned_staff=self.it_staff,
        )
        ExternalWork.objects.create(request=obj, title="x", contractor="NCC Mạng", progress=100, status=ExternalWorkStatus.WAITING_ACCEPTANCE)
        obj.acceptance_records.create(
            inspection_date=timezone.localdate(), inspector=self.it_staff, check_items="Đo tốc độ", result="FAIL",
            remediation_notes="Cấu hình lại switch tầng 3",
        )
        self.assertEqual(self.post_as(self.electrician, f"/api/v1/requests/{obj.code}/ai/acceptance-checklist/").status_code, 404)
        response = self.post_as(self.it_staff, f"/api/v1/requests/{obj.code}/ai/acceptance-checklist/")
        self.assertEqual(response.status_code, 201, response.data)
        items = response.data["output"]["check_items"]
        self.assertTrue(any("switch tầng 3" in item for item in items))
        accepted = self.post_as(self.it_staff, f"/api/v1/requests/{obj.code}/acceptance/", {
            "result": "PASS", "checkItems": "\n".join(f"- {item}" for item in items),
        })
        self.assertEqual(accepted.status_code, 200, accepted.data)
        self.assertEqual(AISuggestion.objects.get(pk=response.data["id"]).status, AISuggestionStatus.ACCEPTED)
