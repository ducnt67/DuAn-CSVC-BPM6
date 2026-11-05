import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, RefreshCw, Search, AlertTriangle, CheckCircle2, XCircle, UserCheck,
  FileText, ShieldCheck, ChevronDown, ChevronUp, Database, Copy,
} from 'lucide-react';
import Button from '../../../dung-chung/thanh-phan/Button';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import { formatCurrency } from '../../../dung-chung/tien-ich/formatCurrency';
import { formatDateTime } from '../../../dung-chung/tien-ich/formatDate';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import {
  AI_KIND_LABELS, AI_RECOMMENDATION_LABELS, AI_STATUS_LABELS, ISSUE_CATEGORY_LABELS,
} from '../../../dung-chung/hang-so/issueCategories';
import {
  applyTriage, dismissSuggestion, getRequestAiState, runRequestAi,
} from '../../../ha-tang/api/aiService';
import './AiAssistant.css';

const KIND_INTRO = {
  TRIAGE: 'AI đọc mô tả, đối chiếu lịch sử thiết bị và các yêu cầu đang mở để đề xuất loại sự cố, mức độ ưu tiên và phát hiện yêu cầu trùng.',
  ASSIGN_SURVEY: 'AI xem chuyên môn, số việc đang mở và kinh nghiệm của từng cán bộ để đề xuất người khảo sát phù hợp.',
  PLAN: 'AI dựa trên kết quả khảo sát, chi phí các ca tương tự và năng lực nhà thầu để gợi ý hình thức sửa chữa và dự toán.',
  APPROVAL_BRIEF: 'AI tóm tắt hồ sơ, so sánh dự toán với khảo sát và lịch sử, chỉ ra rủi ro và đưa khuyến nghị cho Ban Giám hiệu.',
  ASSIGN_INSPECTOR: 'AI đề xuất cán bộ nghiệm thu dựa trên chuyên môn, khối lượng việc, tính khách quan so với người khảo sát và rủi ro của nhà thầu.',
  SURVEY_ASSIST: 'AI gợi ý nguyên nhân thường gặp, hạng mục cần kiểm tra, lưu ý an toàn, vật tư cần mang theo và đánh giá sơ bộ có sửa ngay được không - dựa trên các ca tương tự.',
  ACCEPTANCE_CHECKLIST: 'AI soạn danh mục kiểm tra nghiệm thu theo phương án đã duyệt, các lỗi ở lần nghiệm thu trước và lịch sử của nhà thầu.',
  CONTRACTOR: 'AI so sánh các đơn vị thi công cùng lĩnh vực theo số việc đã làm, số lần nghiệm thu không đạt và trễ hạn để gợi ý nhà thầu.',
};

const LOADING_STEPS = [
  'Đang đọc hồ sơ yêu cầu…',
  'Agent đang chọn công cụ tra cứu dữ liệu…',
  'Đang đối chiếu lịch sử và số liệu liên quan…',
  'Đang tổng hợp đề xuất…',
];

function Confidence({ value }) {
  if (value === undefined || value === null) return null;
  const pct = Math.round(value * 100);
  const level = pct >= 80 ? 'high' : pct >= 60 ? 'mid' : 'low';
  return <span className={`ai-confidence ai-confidence--${level}`}>Độ tin cậy {pct}%</span>;
}

function List({ items, icon = 'dot', tone }) {
  if (!items?.length) return null;
  return (
    <ul className={`ai-list ai-list--${icon} ${tone ? `ai-list--${tone}` : ''}`}>
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  );
}

function CaseLinks({ codes }) {
  if (!codes?.length) return null;
  return (
    <div className="ai-cases">
      Ca tham chiếu:{' '}
      {codes.map((code) => (
        <Link key={code} to={`/requests/${code}`} className="ai-case-link">{code}</Link>
      ))}
    </div>
  );
}

function TriageResult({ output, request, actions }) {
  return (
    <div className="ai-result">
      {output.safety_risk && (
        <div className="ai-alert ai-alert--danger">
          <AlertTriangle size={16} /> Có nguy cơ mất an toàn - nên xử lý ngay và cảnh báo người sử dụng khu vực.
        </div>
      )}
      <div className="ai-kv-grid">
        <div>
          <span className="ai-kv-label">Loại sự cố đề xuất</span>
          <strong>{ISSUE_CATEGORY_LABELS[output.category] || output.category}</strong>
          {request.issueCategory && request.issueCategory !== output.category && (
            <span className="ai-kv-sub">Hiện tại: {ISSUE_CATEGORY_LABELS[request.issueCategory]}</span>
          )}
        </div>
        <div>
          <span className="ai-kv-label">Mức độ đề xuất</span>
          <PriorityBadge priority={output.priority} />
          {request.priority !== output.priority && (
            <span className="ai-kv-sub ai-kv-sub--warn">
              Người gửi chọn: <PriorityBadge priority={request.priority} />
            </span>
          )}
        </div>
      </div>
      <p className="ai-reason"><strong>Lý do:</strong> {output.priority_reason}</p>
      {output.impact_summary && <p className="ai-reason"><strong>Ảnh hưởng:</strong> {output.impact_summary}</p>}
      {output.possible_duplicates?.length > 0 && (
        <div className="ai-alert ai-alert--warning">
          <Copy size={16} />
          <div>
            <strong>Có thể trùng với yêu cầu đang mở:</strong>
            {output.possible_duplicates.map((dup) => (
              <div key={dup.code}>
                <Link to={`/requests/${dup.code}`} className="ai-case-link">{dup.code}</Link> {dup.reason}
              </div>
            ))}
          </div>
        </div>
      )}
      {output.questions_for_requester?.length > 0 && (
        <div className="ai-block">
          <span className="ai-kv-label">Nên hỏi thêm người gửi</span>
          <List items={output.questions_for_requester} />
        </div>
      )}
      {actions}
    </div>
  );
}

function StaffResult({ output, kind, actions, onPick, disabled }) {
  return (
    <div className="ai-result">
      {output.independence_note && <p className="ai-reason"><strong>Tính khách quan:</strong> {output.independence_note}</p>}
      <div className="ai-candidates">
        {output.recommendations.map((rec, index) => (
          <div key={rec.staff_code} className={`ai-candidate ${rec.staff_code === output.best_staff_code ? 'is-best' : ''}`}>
            <div className="ai-candidate__head">
              <span className="ai-rank">#{index + 1}</span>
              <div className="ai-candidate__who">
                <strong>{rec.staff_name}</strong>
                <span>{rec.department}</span>
              </div>
              <div className="ai-score" title="Điểm phù hợp">
                <div className="ai-score__bar"><span style={{ width: `${rec.score}%` }} /></div>
                <b>{rec.score}</b>
              </div>
            </div>
            <List items={rec.reasons} icon="check" />
            <List items={rec.concerns} icon="warn" tone="muted" />
            {onPick && (
              <Button
                size="sm"
                variant={rec.staff_code === output.best_staff_code ? 'primary' : 'outline'}
                icon={UserCheck}
                disabled={disabled}
                onClick={() => onPick(rec.staff_code)}
              >
                {kind === 'ASSIGN_INSPECTOR' ? 'Giao nghiệm thu' : 'Chọn người này'}
              </Button>
            )}
          </div>
        ))}
      </div>
      {actions}
    </div>
  );
}

function PlanResult({ output, actions }) {
  return (
    <div className="ai-result">
      <div className="ai-kv-grid ai-kv-grid--4">
        <div><span className="ai-kv-label">Hình thức</span><strong>{output.repair_type === 'INTERNAL' ? 'Sửa chữa nội bộ' : 'Thuê ngoài'}</strong></div>
        <div><span className="ai-kv-label">Dự toán</span><strong>{formatCurrency(output.estimated_cost)}</strong></div>
        <div><span className="ai-kv-label">Thời gian</span><strong>{output.estimated_duration}</strong></div>
        <div><span className="ai-kv-label">Trình BGH</span><strong>{output.needs_approval ? 'Cần phê duyệt' : 'Không cần'}</strong></div>
      </div>
      <p className="ai-reason"><strong>{output.title}</strong></p>
      {output.description && <p className="ai-reason">{output.description}</p>}
      {output.materials && <p className="ai-reason"><strong>Vật tư:</strong> {output.materials}</p>}
      <List items={output.reasons} icon="check" />
      {output.cost_basis && <p className="ai-reason"><strong>Căn cứ dự toán:</strong> {output.cost_basis}</p>}
      <List items={output.risks} icon="warn" tone="muted" />
      <CaseLinks codes={output.similar_cases} />
      {actions}
    </div>
  );
}

function ApprovalResult({ output, actions }) {
  const tone = { APPROVE: 'success', APPROVE_WITH_CONDITIONS: 'warning', REVISE: 'danger', REJECT: 'danger' }[output.recommendation];
  const cost = output.cost_assessment || {};
  return (
    <div className="ai-result">
      <div className={`ai-verdict ai-verdict--${tone}`}>
        {tone === 'success' ? <CheckCircle2 size={18} /> : tone === 'warning' ? <AlertTriangle size={18} /> : <XCircle size={18} />}
        <div>
          <strong>{AI_RECOMMENDATION_LABELS[output.recommendation]}</strong>
          <span>{output.summary}</span>
        </div>
      </div>
      <div className="ai-kv-grid ai-kv-grid--4">
        <div><span className="ai-kv-label">Dự toán phương án</span><strong>{cost.plan_cost != null ? formatCurrency(cost.plan_cost) : '—'}</strong></div>
        <div><span className="ai-kv-label">Dự toán khảo sát</span><strong>{cost.survey_cost != null ? formatCurrency(cost.survey_cost) : '—'}</strong></div>
        <div>
          <span className="ai-kv-label">TB ca cùng quy mô</span>
          <strong>{cost.similar_avg != null ? formatCurrency(cost.similar_avg) : '—'}</strong>
          <span className="ai-kv-sub">{cost.similar_avg != null ? `${cost.similar_count} ca đã hoàn thành` : 'Chưa có ca cùng quy mô'}</span>
        </div>
        <div>
          <span className="ai-kv-label">Đánh giá chi phí</span>
          <strong>{cost.verdict}{cost.deviation_pct != null ? ` (${cost.deviation_pct > 0 ? '+' : ''}${cost.deviation_pct}%)` : ''}</strong>
          {cost.reference && <span className="ai-kv-sub">so với {cost.reference === 'survey' ? 'dự toán khảo sát' : 'ca cùng quy mô'}</span>}
        </div>
      </div>
      <List items={output.key_points} />
      {output.risks?.length > 0 && <div className="ai-block"><span className="ai-kv-label">Rủi ro</span><List items={output.risks} icon="warn" tone="muted" /></div>}
      {output.conditions?.length > 0 && <div className="ai-block"><span className="ai-kv-label">Điều kiện kèm theo</span><List items={output.conditions} icon="check" /></div>}
      {output.suggested_rejection_reason && (
        <div className="ai-block ai-quote">
          <span className="ai-kv-label">Lý do AI soạn sẵn (nếu trả lại)</span>
          <p>{output.suggested_rejection_reason}</p>
        </div>
      )}
      <CaseLinks codes={output.similar_cases} />
      {actions}
    </div>
  );
}

function SurveyResult({ output, actions }) {
  return (
    <div className="ai-result">
      <div className="ai-kv-grid ai-kv-grid--4">
        <div><span className="ai-kv-label">Đánh giá sơ bộ</span><strong>{output.can_repair_immediately ? 'Có thể sửa ngay (nội bộ)' : 'Báo CSVC lập phương án'}</strong></div>
        <div><span className="ai-kv-label">Mức hư hỏng</span><strong>{output.damage_level}</strong></div>
        <div><span className="ai-kv-label">Dự toán sơ bộ</span><strong>{output.estimated_cost != null ? formatCurrency(output.estimated_cost) : '—'}</strong></div>
        <div><span className="ai-kv-label">Thời gian</span><strong>{output.estimated_time || '—'}</strong></div>
      </div>
      <div className="ai-two-col">
        <div className="ai-block"><span className="ai-kv-label">Nguyên nhân có thể</span><List items={output.likely_causes} /></div>
        <div className="ai-block"><span className="ai-kv-label">Cần kiểm tra tại hiện trường</span><List items={output.checks_on_site} icon="check" /></div>
        <div className="ai-block"><span className="ai-kv-label">Lưu ý an toàn</span><List items={output.safety_notes} icon="warn" tone="muted" /></div>
        <div className="ai-block"><span className="ai-kv-label">Vật tư / dụng cụ mang theo</span><List items={output.parts_or_tools} /></div>
      </div>
      {output.recommended_action && <p className="ai-reason"><strong>Hướng xử lý:</strong> {output.recommended_action}</p>}
      <List items={output.reasons} icon="check" />
      <CaseLinks codes={output.similar_cases} />
      {actions}
    </div>
  );
}

function ChecklistResult({ output, actions }) {
  return (
    <div className="ai-result">
      {output.previous_failures?.length > 0 && (
        <div className="ai-alert ai-alert--warning">
          <AlertTriangle size={16} />
          <div><strong>Lần nghiệm thu trước không đạt:</strong><List items={output.previous_failures} /></div>
        </div>
      )}
      <div className="ai-block"><span className="ai-kv-label">Hạng mục kiểm tra</span>
        <ol className="ai-checklist">{output.check_items.map((item, i) => <li key={i}>{item}</li>)}</ol>
      </div>
      <div className="ai-two-col">
        <div className="ai-block"><span className="ai-kv-label">Tiêu chí đạt</span><List items={output.pass_criteria} icon="check" /></div>
        <div className="ai-block"><span className="ai-kv-label">Điểm dễ không đạt</span><List items={output.focus_risks} icon="warn" tone="muted" /></div>
      </div>
      {output.contractor_note && <p className="ai-reason"><strong>Nhà thầu:</strong> {output.contractor_note}</p>}
      <CaseLinks codes={output.similar_cases} />
      {actions}
    </div>
  );
}

function ContractorResult({ output, actions, onPick }) {
  return (
    <div className="ai-result">
      {output.recommendations.length === 0 && (
        <div className="ai-alert ai-alert--warning"><AlertTriangle size={16} /> Chưa có nhà thầu từng làm lĩnh vực này - nên lấy báo giá cạnh tranh.</div>
      )}
      <div className="ai-candidates">
        {output.recommendations.map((rec, index) => (
          <div key={rec.contractor} className={`ai-candidate ${rec.contractor === output.best_contractor ? 'is-best' : ''}`}>
            <div className="ai-candidate__head">
              <span className="ai-rank">#{index + 1}</span>
              <div className="ai-candidate__who"><strong>{rec.contractor}</strong></div>
              <div className="ai-score" title="Điểm phù hợp">
                <div className="ai-score__bar"><span style={{ width: `${rec.score}%` }} /></div>
                <b>{rec.score}</b>
              </div>
            </div>
            <List items={rec.reasons} icon="check" />
            <List items={rec.concerns} icon="warn" tone="muted" />
            {onPick && (
              <Button size="sm" variant={rec.contractor === output.best_contractor ? 'primary' : 'outline'} onClick={() => onPick(rec.contractor)}>
                Chọn nhà thầu này
              </Button>
            )}
          </div>
        ))}
      </div>
      {output.procurement_note && <p className="ai-reason"><strong>Lưu ý hợp đồng:</strong> {output.procurement_note}</p>}
      {actions}
    </div>
  );
}

function Trace({ suggestion }) {
  const [open, setOpen] = useState(false);
  const steps = suggestion.toolTrace || [];
  return (
    <div className="ai-trace">
      <button type="button" className="ai-trace__toggle" onClick={() => setOpen((v) => !v)}>
        <Database size={14} />
        AI đã tra cứu {steps.length} nguồn dữ liệu
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {!open && (
        <div className="ai-trace__chips">
          {steps.map((step, index) => (
            <span key={index} className={`ai-chip ai-chip--${step.by}`} title={step.summary}>
              <Search size={11} /> {step.label}
            </span>
          ))}
        </div>
      )}
      {open && (
        <ol className="ai-trace__steps">
          {steps.map((step, index) => (
            <li key={index}>
              <code>{step.tool}({Object.entries(step.args || {}).map(([k, v]) => `${k}=${v}`).join(', ')})</code>
              <span>{step.summary}</span>
              <em>{{ agent: 'AI tự gọi', system: 'Hệ thống nạp sẵn', verify: 'Hệ thống kiểm chứng số liệu', rule: 'Luật dự phòng' }[step.by] || step.by} · {step.ms}ms</em>
            </li>
          ))}
        </ol>
      )}
      <div className="ai-meta">
        <span className={`ai-source ai-source--${suggestion.source}`}>
          {suggestion.source === 'gemini' ? `Gemini · ${suggestion.modelName}` : 'Luật dự phòng'}
        </span>
        <span>{(suggestion.latencyMs / 1000).toFixed(1)}s</span>
        <span>{formatDateTime(suggestion.createdAt)} · {suggestion.createdBy}</span>
        {suggestion.status !== 'PENDING' && (
          <span className={`ai-decision ai-decision--${suggestion.status}`}>
            {AI_STATUS_LABELS[suggestion.status]}{suggestion.feedbackNote ? `: ${suggestion.feedbackNote}` : ''}
          </span>
        )}
      </div>
      {suggestion.source === 'rule' && suggestion.error && (
        <div className="ai-fallback-note">Gemini chưa phản hồi được nên hệ thống dùng bộ luật dự phòng.</div>
      )}
    </div>
  );
}

export default function AiAssistantPanel({
  request, currentUser, onRefresh, addToast,
  onApplyAssign, onApplyPlan, onApprove, onReject, onRequestInfo, onApplyInspector,
  onApplySurvey, onApplyChecklist, onApplyContractor, emptyText, className = '',
}) {
  const [state, setState] = useState(null);
  const [activeKind, setActiveKind] = useState(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await getRequestAiState(request.id);
      setState(data);
      setActiveKind((current) => (current && data.available.includes(current) ? current : data.available[0] || null));
    } catch {
      setState({ available: [], latest: {} });
    }
  }, [request.id]);

  useEffect(() => {
    load();
  }, [load, request.status, request.updatedAt]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  if (!state) return emptyText ? <div className="ai-panel ai-empty"><p>Đang tải Trợ lý AI…</p></div> : null;
  if (!state.available.length || !activeKind) {
    return emptyText ? <div className={`ai-panel ai-empty ${className}`}><p>{emptyText}</p></div> : null;
  }

  const suggestion = state.latest?.[activeKind];
  const pending = suggestion?.status === 'PENDING';
  const isDirector = currentUser.role === ROLES.DIRECTOR;

  const run = async () => {
    setRunning(true);
    setStep(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 2500);
    try {
      const created = await runRequestAi(request.id, activeKind);
      setState((prev) => ({ ...prev, latest: { ...prev.latest, [activeKind]: created } }));
      setCollapsed(false);
    } catch (error) {
      addToast(`Trợ lý AI lỗi: ${error.message}`, 'error');
    } finally {
      clearInterval(timerRef.current);
      setRunning(false);
    }
  };

  const dismiss = async () => {
    try {
      const updated = await dismissSuggestion(suggestion.id);
      setState((prev) => ({ ...prev, latest: { ...prev.latest, [activeKind]: updated } }));
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const doApplyTriage = async () => {
    setBusy(true);
    try {
      await applyTriage(request.id, {
        priority: suggestion.output.priority,
        issueCategory: suggestion.output.category,
        note: 'Theo đề xuất của Trợ lý AI',
      });
      addToast('Đã cập nhật loại sự cố và mức độ ưu tiên', 'success');
      await onRefresh();
      await load();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const output = suggestion?.output;
  const skip = pending && (
    <Button size="sm" variant="ghost" onClick={dismiss}>Bỏ qua đề xuất</Button>
  );

  let body = null;
  if (output) {
    if (activeKind === 'TRIAGE') {
      body = (
        <TriageResult
          output={output}
          request={request}
          actions={pending && (
            <div className="ai-actions">
              <Button size="sm" variant="primary" icon={CheckCircle2} loading={busy} onClick={doApplyTriage}>
                Áp dụng phân loại & mức độ
              </Button>
              {output.questions_for_requester?.length > 0 && onRequestInfo && (
                <Button size="sm" variant="outline" onClick={() => onRequestInfo(output.questions_for_requester)}>
                  Yêu cầu người gửi bổ sung
                </Button>
              )}
              {skip}
            </div>
          )}
        />
      );
    } else if (activeKind === 'ASSIGN_SURVEY' || activeKind === 'ASSIGN_INSPECTOR') {
      const picker = activeKind === 'ASSIGN_SURVEY' ? onApplyAssign : onApplyInspector;
      body = (
        <StaffResult
          output={output}
          kind={activeKind}
          disabled={!pending || !picker}
          onPick={pending && picker ? picker : null}
          actions={pending && <div className="ai-actions">{skip}</div>}
        />
      );
    } else if (activeKind === 'PLAN') {
      body = (
        <PlanResult
          output={output}
          actions={pending && (
            <div className="ai-actions">
              <Button size="sm" variant="primary" icon={FileText} onClick={() => onApplyPlan(output)}>
                Dùng phương án này (xem lại trước khi lưu)
              </Button>
              {skip}
            </div>
          )}
        />
      );
    } else if (activeKind === 'APPROVAL_BRIEF') {
      const recommendApprove = ['APPROVE', 'APPROVE_WITH_CONDITIONS'].includes(output.recommendation);
      body = (
        <ApprovalResult
          output={output}
          actions={pending && (isDirector ? (
            <div className="ai-actions">
              {recommendApprove ? (
                <>
                  <Button size="sm" variant="success" icon={ShieldCheck} onClick={onApprove}>Phê duyệt theo khuyến nghị</Button>
                  <Button size="sm" variant="outline" onClick={() => onReject('')}>Vẫn từ chối…</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="danger" icon={XCircle} onClick={() => onReject(output.suggested_rejection_reason)}>
                    Trả lại kèm lý do AI soạn
                  </Button>
                  <Button size="sm" variant="outline" onClick={onApprove}>Vẫn phê duyệt</Button>
                </>
              )}
            </div>
          ) : (
            <p className="ai-hint">Ban Giám hiệu sẽ thấy bản phân tích này khi xem xét phương án.</p>
          ))}
        />
      );
    } else if (activeKind === 'SURVEY_ASSIST') {
      body = (
        <SurveyResult
          output={output}
          actions={pending && (
            <div className="ai-actions">
              {onApplySurvey && (
                <Button size="sm" variant="primary" icon={FileText} onClick={() => onApplySurvey(output)}>
                  Điền vào phiếu khảo sát (xác minh tại hiện trường)
                </Button>
              )}
              {skip}
            </div>
          )}
        />
      );
    } else if (activeKind === 'ACCEPTANCE_CHECKLIST') {
      body = (
        <ChecklistResult
          output={output}
          actions={pending && (
            <div className="ai-actions">
              {onApplyChecklist && (
                <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => onApplyChecklist(output)}>
                  Dùng checklist cho biên bản nghiệm thu
                </Button>
              )}
              {skip}
            </div>
          )}
        />
      );
    } else if (activeKind === 'CONTRACTOR') {
      body = (
        <ContractorResult
          output={output}
          onPick={pending && onApplyContractor ? onApplyContractor : null}
          actions={pending && <div className="ai-actions">{skip}</div>}
        />
      );
    }
  }

  return (
    <section className={`ai-panel ${className}`} aria-label="Trợ lý AI">
      <header className="ai-panel__head">
        <div className="ai-panel__title">
          <span className="ai-panel__icon"><Sparkles size={16} /></span>
          <div>
            <strong>Trợ lý AI</strong>
            <span>{state.aiEnabled ? 'Agent Gemini · chỉ đề xuất, người dùng quyết định' : 'Bộ luật dự phòng (chưa cấu hình Gemini)'}</span>
          </div>
        </div>
        {state.available.length > 1 && (
          <div className="ai-tabs" role="tablist">
            {state.available.map((kind) => (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={kind === activeKind}
                className={`ai-tab ${kind === activeKind ? 'is-active' : ''}`}
                onClick={() => setActiveKind(kind)}
              >
                {AI_KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        )}
        <div className="ai-panel__tools">
          {suggestion && (
            <Button size="sm" variant="ghost" icon={RefreshCw} onClick={run} disabled={running}>Phân tích lại</Button>
          )}
          {suggestion && (
            <button type="button" className="ai-collapse" onClick={() => setCollapsed((v) => !v)} aria-label="Thu gọn">
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          )}
        </div>
      </header>

      {running && (
        <div className="ai-loading">
          <span className="ai-loading__pulse" />
          <div>
            <strong>{AI_KIND_LABELS[activeKind]}</strong>
            <span>{LOADING_STEPS[step]}</span>
          </div>
        </div>
      )}

      {!running && !suggestion && (
        <div className="ai-empty">
          <p>{KIND_INTRO[activeKind]}</p>
          <Button variant="primary" icon={Sparkles} onClick={run}>Phân tích ngay</Button>
        </div>
      )}

      {!running && suggestion && !collapsed && (
        <>
          {output?.summary && activeKind !== 'APPROVAL_BRIEF' && (
            <p className="ai-summary">{output.summary} <Confidence value={output.confidence} /></p>
          )}
          {activeKind === 'APPROVAL_BRIEF' && <div className="ai-summary-row"><Confidence value={output.confidence} /></div>}
          {body}
          <Trace suggestion={suggestion} />
        </>
      )}
    </section>
  );
}
