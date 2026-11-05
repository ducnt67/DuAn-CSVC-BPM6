"""Vòng lặp agent: Gemini tự quyết định gọi công cụ nào, hệ thống thực thi và trả kết quả lại,
lặp đến khi mô hình đưa ra đề xuất cuối cùng. Lỗi/quá tải -> bộ luật dự phòng."""

import time
from dataclasses import dataclass, field

from django.conf import settings

from core.ai import gemini
from core.ai.fallback import FALLBACKS, cost_reference
from core.ai.tasks import NORMALIZERS, TASKS, OutputError, build_user_prompt, parse_json, system_prompt
from core.ai.tools import TOOLS, declarations, run_tool, summarize
from core.models import Role
from core.services import requests_visible_to


TOOL_REQUIRED_KINDS = {
    "TRIAGE", "ASSIGN_SURVEY", "PLAN", "APPROVAL_BRIEF", "ASSIGN_INSPECTOR",
    "SURVEY_ASSIST", "ACCEPTANCE_CHECKLIST", "CONTRACTOR",
}


def _valid_codes(user, codes):
    codes = [str(c).strip().upper() for c in codes if c]
    existing = set(requests_visible_to(user).filter(code__in=codes).values_list("code", flat=True))
    return [c for c in dict.fromkeys(codes) if c in existing]


def ground_output(kind, output, context, user, call_tool):
    """Kiểm chứng đầu ra của mô hình bằng dữ liệu thật: số liệu do hệ thống tính, AI chỉ lập luận.

    - Mã yêu cầu AI nhắc tới phải tồn tại và nằm trong phạm vi người dùng được xem.
    - Chi phí trong bản hỗ trợ phê duyệt được tính lại từ hồ sơ và các ca tương tự.
    """
    if "similar_cases" in output:
        output["similar_cases"] = _valid_codes(user, output["similar_cases"])
    if "possible_duplicates" in output:
        valid = set(_valid_codes(user, [d["code"] for d in output["possible_duplicates"]]))
        output["possible_duplicates"] = [d for d in output["possible_duplicates"] if d["code"] in valid]
    if kind == "APPROVAL_BRIEF" and context.get("request"):
        req = context["request"]
        similar = call_tool("find_similar_requests", {"code": req["code"]}, by="verify")
        output["cost_assessment"].update(cost_reference(req, similar))
    return output


@dataclass
class AgentResult:
    output: dict
    trace: list = field(default_factory=list)
    source: str = "rule"
    model_name: str = ""
    latency_ms: int = 0
    error: str = ""


def allowed_tools(kind, user):
    spec = TASKS[kind]
    if kind == "CHAT" and user.role == Role.REQUESTER:
        return list(spec["requester_tools"])
    return list(spec["tools"])


def run_agent(kind, user, request_obj=None, draft=None, message="", history=None):
    started = time.monotonic()
    deadline = started + settings.AI_AGENT_DEADLINE
    tools = allowed_tools(kind, user)
    trace = []

    def call_tool(name, args, by="rule"):
        tool_started = time.monotonic()
        result = run_tool(user, name, args, tools + ["get_request_detail"])
        trace.append({
            "tool": name,
            "label": TOOLS.get(name, {}).get("label", name),
            "args": {k: v for k, v in (args or {}).items() if v not in (None, "")},
            "summary": summarize(name, result),
            "ms": int((time.monotonic() - tool_started) * 1000),
            "by": by,
        })
        return result

    context = {"draft": draft, "message": message, "history": history or []}
    if request_obj is not None:
        context["request"] = call_tool("get_request_detail", {"code": request_obj.code}, by="system")

    output, source, model_name, error = None, "rule", "", ""
    if gemini.is_configured():
        llm_trace_start = len(trace)
        try:
            output, model_name = _llm_loop(kind, user, context, tools, call_tool, deadline)
            output = ground_output(kind, output, context, user, call_tool)
            source = "gemini"
        except (gemini.GeminiError, OutputError) as exc:
            error = str(exc)[:800]
            del trace[llm_trace_start:]
            output = None
    else:
        error = "Chưa cấu hình GEMINI_API_KEY - dùng bộ luật dự phòng."

    if output is None:
        output = FALLBACKS[kind](user, context, call_tool)
        source = "rule"
    return AgentResult(
        output=output,
        trace=trace,
        source=source,
        model_name=model_name,
        latency_ms=int((time.monotonic() - started) * 1000),
        error=error,
    )


def _llm_loop(kind, user, context, tools, call_tool, deadline):
    system = system_prompt(user)
    contents = [{"role": "user", "parts": [{"text": build_user_prompt(kind, context)}]}]
    tool_decls = declarations(tools)
    model_name = ""
    text = ""
    agent_calls = 0
    nudged = False
    for _ in range(settings.AI_MAX_TOOL_ROUNDS):
        content, model_name = gemini.generate(contents, system, tools=tool_decls, deadline=deadline)
        contents.append(content)
        calls = gemini.extract_function_calls(content)
        if not calls:
            if kind in TOOL_REQUIRED_KINDS and agent_calls == 0 and not nudged:
                # Agent kết luận khi chưa tra cứu gì -> nhắc một lần phải dùng công cụ.
                nudged = True
                contents.append({"role": "user", "parts": [{"text": (
                    "Bạn chưa tra cứu dữ liệu nào ngoài hồ sơ. Hãy gọi các công cụ phù hợp "
                    "(ca tương tự, thống kê chi phí, cán bộ...) trước khi đưa ra kết luận."
                )}]})
                continue
            text = gemini.extract_text(content)
            break
        agent_calls += len(calls)
        responses = []
        for call in calls:
            result = call_tool(call.get("name", ""), call.get("args") or {}, by="agent")
            function_response = {"name": call.get("name", ""), "response": {"result": result}}
            if call.get("id"):
                function_response["id"] = call["id"]
            responses.append({"functionResponse": function_response})
        contents.append({"role": "user", "parts": responses})
    else:
        contents.append({"role": "user", "parts": [{"text": "Đã đủ lượt tra cứu. Hãy đưa ra kết quả cuối cùng ngay bây giờ."}]})
        content, model_name = gemini.generate(
            contents, system, tools=tool_decls, deadline=deadline, force_answer=True,
            json_mode=kind != "CHAT",
        )
        text = gemini.extract_text(content)

    if kind == "CHAT":
        if not text:
            raise OutputError("Mô hình không trả lời.")
        return {"answer": text[:6000]}, model_name

    try:
        raw = parse_json(text)
    except OutputError:
        # Một lần "sửa định dạng": yêu cầu mô hình chỉ xuất JSON.
        contents.append({"role": "user", "parts": [{"text": "Phản hồi trên chưa đúng định dạng. Chỉ trả về đối tượng JSON theo định dạng đã yêu cầu."}]})
        content, model_name = gemini.generate(
            contents, system, tools=tool_decls, deadline=deadline, force_answer=True, json_mode=True,
        )
        raw = parse_json(gemini.extract_text(content))
    return NORMALIZERS[kind](raw, context), model_name
