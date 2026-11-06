from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APITestCase

from core.models import (
    ContractHandling,
    ExternalWork,
    ExternalWorkStatus,
    Notification,
    RepairPlan,
    RepairRequest,
    RequestStatus,
    Role,
    Survey,
    User,
    UserSession,
)


class RepairWorkflowTests(APITestCase):
    def setUp(self):
        self.requester = self.make_user("requester", Role.REQUESTER)
        self.admin = self.make_user("facility-admin", Role.FACILITY_ADMIN)
        self.staff = self.make_user("staff", Role.STAFF)
        self.director = self.make_user("director", Role.DIRECTOR)
        self.procurement = self.make_user("procurement", Role.PROCUREMENT)

    def make_user(self, username, role):
        return User.objects.create_user(
            username=username,
            password="SecurePass123!",
            first_name=username,
            email=f"{username}@due.edu.vn",
            role=role,
            code=f"U-{username}",
        )

    def make_request(self, **kwargs):
        defaults = {
            "title": "Hỏng điều hòa phòng học",
            "building": "Khu C",
            "location": "Tầng 1, phòng 101",
            "requester": self.requester,
            "requester_name": "Người gửi",
            "description": "Máy điều hòa không hoạt động.",
            "status": RequestStatus.NEW,
        }
        defaults.update(kwargs)
        return RepairRequest.objects.create(**defaults)

    def post_as(self, user, path, data=None):
        self.client.force_authenticate(user)
        return self.client.post(path, data or {}, format="json")

    def test_database_rejects_invalid_costs_and_progress(self):
        obj = self.make_request()

        def assert_rejected(write):
            with self.assertRaises(IntegrityError):
                with transaction.atomic():
                    write()

        assert_rejected(
            lambda: RepairRequest.objects.filter(pk=obj.pk).update(external_progress=101)
        )
        assert_rejected(
            lambda: RepairRequest.objects.filter(pk=obj.pk).update(estimated_cost=-1)
        )
        assert_rejected(
            lambda: RepairRequest.objects.filter(pk=obj.pk).update(remediation_hours=0)
        )
        assert_rejected(
            lambda: Survey.objects.create(
                request=obj,
                survey_date=timezone.now(),
                findings="Hiện trạng",
                root_cause="Nguyên nhân",
                estimated_cost=-1,
                surveyor=self.staff,
            )
        )
        assert_rejected(
            lambda: RepairPlan.objects.create(
                request=obj,
                title="Phương án không hợp lệ",
                repair_type="INTERNAL",
                estimated_cost=-1,
                proposed_by=self.admin,
            )
        )
        assert_rejected(
            lambda: ExternalWork.objects.create(
                request=obj,
                title="Công việc không hợp lệ",
                progress=101,
            )
        )

    def test_internal_flow_requires_requester_confirmation(self):
        obj = self.make_request(status=RequestStatus.INTERNAL_REPAIR, assigned_staff=self.staff)
        obj.repair_type = "INTERNAL"
        obj.save()
        response = self.post_as(
            self.staff, f"/api/v1/requests/{obj.code}/internal-result/",
            {"workDone": "Đã thay bóng đèn.", "partsReplaced": "Bóng LED"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("history", response.data)
        obj.refresh_from_db()
        self.assertEqual(obj.status, RequestStatus.WAITING_FOR_CONFIRMATION)
        response = self.post_as(
            self.staff, f"/api/v1/requests/{obj.code}/confirm/", {"result": "PASS"}
        )
        self.assertEqual(response.status_code, 403)
        response = self.post_as(
            self.requester, f"/api/v1/requests/{obj.code}/confirm/",
            {"result": "PASS", "feedback": "Đã kiểm tra, hoạt động tốt."},
        )
        self.assertEqual(response.status_code, 200)
        obj.refresh_from_db()
        self.assertEqual(obj.status, RequestStatus.COMPLETED)

    def test_external_flow_enforces_approval_and_remediation_deadline(self):
        obj = self.make_request(status=RequestStatus.WAITING_FOR_APPROVAL, assigned_staff=self.staff)
        obj.repair_type = "EXTERNAL"
        obj.save()
        from core.models import RepairPlan, RepairPlanStatus, RepairType

        plan = RepairPlan.objects.create(
            request=obj,
            title="Thay máy điều hòa",
            repair_type=RepairType.EXTERNAL,
            proposed_by=self.staff,
            requires_approval=True,
            approval_status=RepairPlanStatus.PENDING,
        )
        response = self.post_as(self.director, f"/api/v1/requests/{obj.code}/approve/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("repairPlans", response.data, response.data)
        self.assertEqual(response.data["repairPlans"][0]["approvalStatus"], "APPROVED")
        work = ExternalWork.objects.get(request=obj, plan=plan)
        response = self.post_as(
            self.procurement,
            f"/api/v1/requests/{obj.code}/update-external-work/",
            {
                "contractor": "Đơn vị thi công",
                "progress": 50,
                "workNotes": "Đã bắt đầu.",
            },
        )
        self.assertEqual(response.status_code, 200)
        response = self.post_as(
            self.procurement,
            f"/api/v1/requests/{obj.code}/external-work-done/",
            {"workResult": "Đã thi công."},
        )
        self.assertEqual(response.status_code, 200)
        response = self.post_as(
            self.staff,
            f"/api/v1/requests/{obj.code}/acceptance/",
            {
                "inspectionDate": "2026-10-31",
                "checkItems": "Kiểm tra chạy thử.",
                "result": "FAIL",
                "remediationNotes": "Cần thay linh kiện.",
            },
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["detail"], "Bạn không có quyền nghiệm thu kết quả.")
        response = self.post_as(
            self.admin,
            f"/api/v1/requests/{obj.code}/assign-inspector/",
            {"staffId": self.staff.code},
        )
        self.assertEqual(response.status_code, 200)
        response = self.post_as(
            self.staff,
            f"/api/v1/requests/{obj.code}/acceptance/",
            {
                "inspectionDate": "2026-10-31",
                "checkItems": "Kiểm tra chạy thử.",
                "result": "FAIL",
                "remediationNotes": "Cần thay linh kiện.",
            },
        )
        self.assertEqual(response.status_code, 200)
        obj.refresh_from_db()
        self.assertEqual(obj.status, RequestStatus.WAITING_REMEDIATION_RESPONSE)
        response = self.post_as(
            self.staff,
            f"/api/v1/requests/{obj.code}/contract-handling/",
            {"actions": ["Phạt vi phạm"], "overdueNote": "Chưa khắc phục."},
        )
        self.assertEqual(response.status_code, 400)
        obj.remediation_deadline = timezone.now() - timedelta(seconds=1)
        obj.save(update_fields=["remediation_deadline"])
        response = self.post_as(
            self.staff,
            f"/api/v1/requests/{obj.code}/contract-handling/",
            {"actions": ["Phạt vi phạm"], "overdueNote": "Chưa khắc phục."},
        )
        self.assertEqual(response.status_code, 200)
        obj.refresh_from_db()
        self.assertEqual(obj.status, RequestStatus.OVERDUE_REMEDIATION)
        self.assertTrue(ContractHandling.objects.filter(request=obj).exists())
        self.assertEqual(response.data["contractHandling"]["actions"], ["Phạt vi phạm"])
        work.refresh_from_db()
        self.assertEqual(work.status, ExternalWorkStatus.OVERDUE_REMEDIATION)

    def test_only_requester_can_create_and_attachment_names_are_saved(self):
        payload = {
            "title": "Hỏng máy chiếu",
            "building": "Khu D",
            "location": "Phòng 201",
            "description": "Không lên hình.",
            "priority": "HIGH",
            "attachments": ["may-chieu.jpg"],
        }
        response = self.post_as(self.requester, "/api/v1/requests/", payload)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["attachments"], ["may-chieu.jpg"])
        self.assertEqual(response.data["status"], RequestStatus.NEW)
        response = self.post_as(self.staff, "/api/v1/requests/", payload)
        self.assertEqual(response.status_code, 403)

    def test_survey_and_plan_capture_structured_records(self):
        obj = self.make_request(status=RequestStatus.SURVEYING, assigned_staff=self.staff)
        response = self.post_as(
            self.staff,
            f"/api/v1/requests/{obj.code}/survey/",
            {
                "surveyDate": "2026-10-31T09:00:00+07:00",
                "findings": "Bóng đèn bị cháy.",
                "rootCause": "Hết tuổi thọ.",
                "damageLevel": "Nhẹ",
                "estimatedCost": 250000,
            },
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["survey"]["findings"], "Bóng đèn bị cháy.")
        self.assertTrue(
            Notification.objects.filter(
                request=obj,
                target_role=Role.FACILITY_ADMIN,
                title="Yêu cầu đã khảo sát xong",
            ).exists()
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/v1/requests/")
        self.assertIn(obj.code, [item["id"] for item in response.data["results"]])
        response = self.client.get("/api/v1/notifications/")
        self.assertTrue(
            any(item["title"] == "Yêu cầu đã khảo sát xong" for item in response.data["results"])
        )
        response = self.post_as(
            self.staff,
            f"/api/v1/requests/{obj.code}/repair-plan/",
            {
                "title": "Thay bóng đèn",
                "repairType": "INTERNAL",
                "estimatedCost": 250000,
            },
        )
        self.assertEqual(response.status_code, 403)
        response = self.post_as(
            self.admin,
            f"/api/v1/requests/{obj.code}/repair-plan/",
            {
                "title": "Thay bóng đèn",
                "repairType": "INTERNAL",
                "estimatedCost": 250000,
            },
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(
            RepairPlan.objects.filter(request=obj, proposed_by=self.admin).exists()
        )
        obj.refresh_from_db()
        self.assertEqual(obj.status, RequestStatus.INTERNAL_REPAIR)
        self.assertIn("approvalStatus", response.data, response.data)
        self.assertEqual(response.data["approvalStatus"], "APPROVED")
        self.assertEqual(len(response.data["approvalHistory"]), 2)

    def test_jwt_login_accepts_email(self):
        response = self.client.post(
            "/api/v1/auth/token/",
            {"username": self.requester.email, "password": "SecurePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("access", response.data)

    def test_logout_revokes_active_session_and_refresh_token(self):
        response = self.client.post(
            "/api/v1/auth/token/",
            {"username": self.requester.username, "password": "SecurePass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        access = response.data["access"]
        refresh = response.data["refresh"]
        session = UserSession.objects.get(user=self.requester)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 200)

        logout_response = self.client.post(
            "/api/v1/auth/logout/", {"refresh": refresh}, format="json"
        )
        self.assertEqual(logout_response.status_code, 204)
        session.refresh_from_db()
        self.assertIsNotNone(session.revoked_at)
        self.assertEqual(self.client.get("/api/v1/auth/me/").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/token/refresh/",
                {"refresh": refresh},
                format="json",
            ).status_code,
            401,
        )

    def test_facility_catalog_write_is_role_protected(self):
        payload = {
            "id": "CSVC-TEST-01",
            "name": "Phòng kiểm thử",
            "type": "Phòng học",
            "building": "Khu C",
            "location": "Tầng 1",
            "managedBy": "Phòng Quản trị",
            "status": "ACTIVE",
            "description": "Dữ liệu kiểm thử",
        }
        response = self.post_as(self.admin, "/api/v1/facilities/", payload)
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["id"], payload["id"])
        response = self.post_as(self.staff, "/api/v1/facilities/", payload)
        self.assertEqual(response.status_code, 403)

    def test_rejection_requires_reason_and_returns_request_to_plan_stage(self):
        from core.models import RepairPlan, RepairPlanStatus, RepairType

        obj = self.make_request(status=RequestStatus.WAITING_FOR_APPROVAL, assigned_staff=self.staff)
        plan = RepairPlan.objects.create(
            request=obj,
            title="Thuê đơn vị sửa chữa",
            repair_type=RepairType.EXTERNAL,
            proposed_by=self.staff,
            requires_approval=True,
            approval_status=RepairPlanStatus.PENDING,
        )
        response = self.post_as(self.director, f"/api/v1/requests/{obj.code}/reject/", {})
        self.assertEqual(response.status_code, 400)
        plan.refresh_from_db()
        self.assertEqual(plan.approval_status, RepairPlanStatus.PENDING)
        response = self.post_as(
            self.director,
            f"/api/v1/requests/{obj.code}/reject/",
            {"reason": "Cần bổ sung căn cứ dự toán."},
        )
        self.assertEqual(response.status_code, 200, response.data)
        obj.refresh_from_db()
        plan.refresh_from_db()
        self.assertEqual(obj.status, RequestStatus.WAITING_FOR_PLAN)
        self.assertEqual(plan.approval_status, RepairPlanStatus.REJECTED)
        self.assertTrue(
            Notification.objects.filter(
                request=obj,
                target_role=Role.FACILITY_ADMIN,
                title="Phương án bị từ chối",
            ).exists()
        )

    def test_reports_summarize_database_and_export_utf8_csv(self):
        self.make_request(
            status=RequestStatus.COMPLETED,
            estimated_cost=100000,
            repair_type="INTERNAL",
        )
        self.make_request(
            status=RequestStatus.WAITING_REMEDIATION_RESPONSE,
            title="=HYPERLINK(\"https://example.invalid\")",
            estimated_cost=200000,
            repair_type="EXTERNAL",
        )
        self.client.force_authenticate(self.requester)
        response = self.client.get("/api/v1/reports/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 2)
        self.assertEqual(response.data["completed"], 1)
        self.assertEqual(response.data["remediation"], 1)
        self.assertEqual(str(response.data["totalCost"]), "300000")
        csv_response = self.client.get("/api/v1/reports/export.csv")
        self.assertEqual(csv_response.status_code, 200)
        self.assertTrue(csv_response.content.startswith(b"\xef\xbb\xbf"))
        self.assertIn(b"'=HYPERLINK", csv_response.content)

    def test_survey_immediate_advances_to_step_5_internal_repair(self):
        obj = self.make_request(status=RequestStatus.SURVEYING, assigned_staff=self.staff)
        response = self.post_as(
            self.staff,
            f"/api/v1/requests/{obj.code}/survey/",
            {
                "surveyDate": "2026-11-03T10:00:00+07:00",
                "findings": "Cầu chì bảng điện bị tuột chân cắm.",
                "rootCause": "Lỏng tiếp xúc cơ học.",
                "canRepairImmediately": True,
            },
        )
        self.assertEqual(response.status_code, 200, response.data)
        obj.refresh_from_db()
        self.assertEqual(obj.status, RequestStatus.INTERNAL_REPAIR)
        self.assertEqual(obj.repair_type, "INTERNAL")
        self.assertTrue(
            Notification.objects.filter(
                request=obj,
                target_role=Role.STAFF,
                title="Bắt đầu sửa chữa nội bộ",
            ).exists()
        )
