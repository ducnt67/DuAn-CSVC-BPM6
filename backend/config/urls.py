from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.serializers import UsernameOrEmailTokenSerializer
from core.views import (
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


class UsernameOrEmailTokenView(TokenObtainPairView):
    serializer_class = UsernameOrEmailTokenSerializer


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/token/", UsernameOrEmailTokenView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/me/", CurrentUserView.as_view(), name="current-user"),
    path("api/v1/reports/summary/", ReportSummaryView.as_view(), name="report-summary"),
    path("api/v1/reports/export.csv", ReportExportView.as_view(), name="report-export"),
    path("api/v1/", include(router.urls)),
]
