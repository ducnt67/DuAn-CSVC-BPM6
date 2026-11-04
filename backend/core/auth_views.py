from datetime import datetime

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import UserSession
from core.serializers import UsernameOrEmailTokenSerializer


class SessionTokenObtainPairSerializer(UsernameOrEmailTokenSerializer):
    def validate(self, attrs):
        super().validate(attrs)
        refresh = RefreshToken.for_user(self.user)
        session = UserSession.objects.create(
            user=self.user,
            token_jti=str(refresh["jti"]),
            expires_at=datetime.fromtimestamp(
                refresh["exp"], tz=timezone.get_current_timezone()
            ),
        )
        refresh["sid"] = str(session.id)
        refresh.access_token["sid"] = str(session.id)
        return {"refresh": str(refresh), "access": str(refresh.access_token)}


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_value = request.data.get("refresh")
        if not refresh_value:
            return Response(status=status.HTTP_204_NO_CONTENT)

        try:
            refresh = RefreshToken(refresh_value)
            session_id = refresh.get("sid")
            if session_id:
                UserSession.objects.filter(
                    id=session_id, revoked_at__isnull=True
                ).update(revoked_at=timezone.now())
            refresh.blacklist()
        except TokenError:
            # Logout is idempotent: an expired or already revoked token is logged out.
            pass

        return Response(status=status.HTTP_204_NO_CONTENT)
