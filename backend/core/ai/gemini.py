"""Client tối giản cho Gemini API (Google AI Studio) qua REST, không cần thư viện ngoài."""

import json
import time
import urllib.error
import urllib.request

from django.conf import settings

API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class GeminiError(Exception):
    def __init__(self, message, status=None, retryable=False):
        super().__init__(message)
        self.status = status
        self.retryable = retryable


def is_configured():
    return bool(getattr(settings, "GEMINI_API_KEY", ""))


def _post(model, payload, timeout):
    url = f"{API_BASE}/{model}:generateContent"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": settings.GEMINI_API_KEY,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        try:
            message = json.loads(body).get("error", {}).get("message", body)
        except ValueError:
            message = body
        raise GeminiError(
            f"{model}: HTTP {error.code} - {message[:300]}",
            status=error.code,
            retryable=error.code in RETRYABLE_STATUS,
        ) from error
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        raise GeminiError(f"{model}: lỗi kết nối - {error}", retryable=True) from error


def generate(contents, system_instruction, tools=None, json_mode=False, deadline=None, force_answer=False):
    """Gọi generateContent, tự chuyển sang model dự phòng khi model đang quá tải.

    Trả về (content, model_name): content là đối tượng `content` của ứng viên đầu tiên
    (giữ nguyên các part, kể cả thoughtSignature, để gửi lại ở lượt sau).
    """
    if not is_configured():
        raise GeminiError("Chưa cấu hình GEMINI_API_KEY.")
    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.2},
    }
    if tools:
        payload["tools"] = [{"functionDeclarations": tools}]
        if force_answer:
            payload["toolConfig"] = {"functionCallingConfig": {"mode": "NONE"}}
    if json_mode:
        payload["generationConfig"]["responseMimeType"] = "application/json"

    errors = []
    for model in settings.GEMINI_MODELS:
        remaining = (deadline - time.monotonic()) if deadline else settings.AI_REQUEST_TIMEOUT
        if remaining < 3:
            errors.append("hết thời gian chờ")
            break
        timeout = min(settings.AI_REQUEST_TIMEOUT, remaining)
        try:
            data = _post(model, payload, timeout)
        except GeminiError as error:
            errors.append(str(error))
            if error.retryable:
                continue
            raise
        candidates = data.get("candidates") or []
        if not candidates or not candidates[0].get("content"):
            reason = (data.get("promptFeedback") or {}).get("blockReason") or (
                candidates[0].get("finishReason") if candidates else "EMPTY"
            )
            errors.append(f"{model}: phản hồi rỗng ({reason})")
            continue
        content = candidates[0]["content"]
        content.setdefault("role", "model")
        content.setdefault("parts", [])
        return content, model
    raise GeminiError(" | ".join(errors) or "Không gọi được Gemini.", retryable=True)


def extract_text(content):
    return "".join(
        part.get("text", "") for part in content.get("parts", []) if not part.get("thought")
    ).strip()


def extract_function_calls(content):
    return [part["functionCall"] for part in content.get("parts", []) if "functionCall" in part]
