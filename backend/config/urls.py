from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.auth_views import LogoutView, SessionTokenObtainPairSerializer
from core.views import (
    AIChatView,
    AIStatsView,
    AIStatusView,
    AISuggestionViewSet,
    AITriagePreviewView,
    CurrentUserView,
    FacilityViewSet,
    NotificationViewSet,
    ReportExportView,
    ReportSummaryView,
    RepairPlanViewSet,
    RepairRequestViewSet,
    UserViewSet,
    ExternalWorkViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("facilities", FacilityViewSet, basename="facility")
router.register("requests", RepairRequestViewSet, basename="repair-request")
router.register("repair-plans", RepairPlanViewSet, basename="repair-plan")
router.register("external-works", ExternalWorkViewSet, basename="external-work")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("ai/suggestions", AISuggestionViewSet, basename="ai-suggestion")


class UsernameOrEmailTokenView(TokenObtainPairView):
    serializer_class = SessionTokenObtainPairSerializer


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/token/", UsernameOrEmailTokenView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/logout/", LogoutView.as_view(), name="logout"),
    path("api/v1/auth/me/", CurrentUserView.as_view(), name="current-user"),
    path("api/v1/reports/summary/", ReportSummaryView.as_view(), name="report-summary"),
    path("api/v1/reports/export.csv", ReportExportView.as_view(), name="report-export"),
    path("api/v1/ai/status/", AIStatusView.as_view(), name="ai-status"),
    path("api/v1/ai/chat/", AIChatView.as_view(), name="ai-chat"),
    path("api/v1/ai/triage-preview/", AITriagePreviewView.as_view(), name="ai-triage-preview"),
    path("api/v1/ai/stats/", AIStatsView.as_view(), name="ai-stats"),
    path("api/v1/", include(router.urls)),
]
