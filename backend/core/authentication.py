from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication

from core.models import UserSession


class SessionJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, token = result
        session_id = token.get("sid")
        if not session_id:
            return None

        session = UserSession.objects.filter(
            id=session_id,
            user=user,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).first()
        if session is None:
            return None

        session.last_seen_at = timezone.now()
        session.save(update_fields=["last_seen_at"])
        return user, token
