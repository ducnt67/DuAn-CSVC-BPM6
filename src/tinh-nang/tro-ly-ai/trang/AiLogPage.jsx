import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Sparkles, CheckCircle2, PencilLine, XCircle, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import Button from '../../../dung-chung/thanh-phan/Button';
import { formatDateTime } from '../../../dung-chung/tien-ich/formatDate';
import { AI_KIND_LABELS, AI_STATUS_LABELS } from '../../../dung-chung/hang-so/issueCategories';
import { getAiStats, listSuggestions } from '../../../ha-tang/api/aiService';
import '../thanh-phan/AiAssistant.css';
import './AiLogPage.css';

// Kết quả của đề xuất là trạng thái -> dùng bảng màu trạng thái cố định, luôn kèm biểu tượng + nhãn.
const OUTCOMES = [
  { key: 'accepted', status: 'ACCEPTED', label: 'Chấp nhận', icon: CheckCircle2, color: 'var(--viz-good)' },
  { key: 'modified', status: 'MODIFIED', label: 'Điều chỉnh', icon: PencilLine, color: 'var(--viz-warning)' },
  { key: 'rejected', status: 'REJECTED', label: 'Không theo', icon: XCircle, color: 'var(--viz-critical)' },
  { key: 'pending', status: 'PENDING', label: 'Chưa quyết định', icon: Clock, color: 'var(--viz-neutral)' },
];

const pct = (value) => (value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`);

function StatTile({ label, value, hint }) {
  return (
    <div className="ai-stat">
      <span className="ai-stat__label">{label}</span>
      <strong className="ai-stat__value">{value}</strong>
      {hint && <span className="ai-stat__hint">{hint}</span>}
    </div>
  );
}

function OutcomeBar({ row }) {
  const total = OUTCOMES.reduce((sum, o) => sum + row[o.key], 0);
  if (!total) return <div className="ai-outcome-bar ai-outcome-bar--empty" aria-label="Chưa có dữ liệu" />;
  return (
    <div className="ai-outcome-bar" role="img" aria-label={OUTCOMES.map((o) => `${o.label} ${row[o.key]}`).join(', ')}>
      {OUTCOMES.filter((o) => row[o.key] > 0).map((o) => (
        <span
          key={o.key}
          style={{ flexGrow: row[o.key], background: o.color }}
          title={`${o.label}: ${row[o.key]} (${Math.round((row[o.key] / total) * 100)}%)`}
        />
      ))}
    </div>
  );
}

function outputSummary(item) {
  const o = item.output || {};
  switch (item.kind) {
    case 'TRIAGE':
    case 'TRIAGE_PREVIEW':
      return `Mức độ ${o.priority} · ${o.category}${o.possible_duplicates?.length ? ` · trùng ${o.possible_duplicates.map((d) => d.code).join(', ')}` : ''}`;
    case 'ASSIGN_SURVEY':
    case 'ASSIGN_INSPECTOR':
      return (o.recommendations || []).map((r, i) => `#${i + 1} ${r.staff_name} (${r.score})`).join(' · ');
    case 'PLAN':
      return `${o.repair_type === 'INTERNAL' ? 'Nội bộ' : 'Thuê ngoài'} · ${Number(o.estimated_cost || 0).toLocaleString('vi-VN')}đ · ${o.estimated_duration}`;
    case 'APPROVAL_BRIEF':
      return `${o.recommendation} · ${o.summary || ''}`;
    case 'CHAT':
      return `Hỏi: ${item.prompt}`;
    default:
      return '';
  }
}

const PAGE_SIZE = 20;

// Dãy số trang gọn: 1 … 4 5 6 … 12
function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
}

export default function AiLogPage() {
  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [filters, setFilters] = useState({ kind: '', status: '', source: '' });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    try {
      setStats(await getAiStats());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Mỗi lần chỉ tải 1 trang (20 bản ghi); đổi trang không tải lại phần thống kê
  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listSuggestions({ ...filters, page, page_size: PAGE_SIZE });
      setItems(data.results || []);
      setCount(data.count || 0);
      setExpanded(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const reload = () => {
    loadStats();
    loadPage();
  };

  const changeFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const rows = (stats?.byKind || []).filter((row) => row.total > 0 || row.kind !== 'CHAT');

  return (
    <div className="ai-log">
      <PageHeader
        title="Nhật ký Trợ lý AI"
        description="Mỗi đề xuất của AI được lưu lại cùng quyết định thực tế của người dùng, làm căn cứ đánh giá hiệu quả của agent."
        badge={stats && (
          <span className={`ai-source ai-source--${stats.aiEnabled ? 'gemini' : 'rule'}`}>
            {stats.aiEnabled ? 'Gemini đang hoạt động' : 'Đang dùng bộ luật dự phòng'}
          </span>
        )}
        actions={<Button variant="outline" icon={RefreshCw} onClick={reload} loading={loading}>Tải lại</Button>}
      />

      {error && <div className="ai-alert ai-alert--danger">{error}</div>}

      {stats && (
        <div className="ai-stat-row">
          <StatTile label="Tổng số lần AI phân tích" value={stats.total} hint={`Gemini ${stats.sources.gemini || 0} · Luật dự phòng ${stats.sources.rule || 0}`} />
          <StatTile label="Tỉ lệ chấp nhận" value={pct(stats.acceptanceRate)} hint={`${stats.accepted}/${stats.decided} đề xuất đã có quyết định`} />
          <StatTile label="Tỉ lệ đồng thuận" value={pct(stats.agreementRate)} hint="Chấp nhận + điều chỉnh một phần" />
          <StatTile label="Thời gian phản hồi TB" value={`${(stats.avgLatencyMs / 1000).toFixed(1)}s`} hint="Gồm cả các vòng gọi công cụ" />
          <StatTile label="Lượt tra cứu dữ liệu" value={stats.toolCalls} hint="Số lần agent gọi công cụ" />
        </div>
      )}

      {stats && (
        <section className="ai-card">
          <header className="ai-card__head">
            <h2>Hiệu quả theo loại đề xuất</h2>
            <div className="ai-legend">
              {OUTCOMES.map((o) => (
                <span key={o.key}><i style={{ background: o.color }} /> <o.icon size={13} /> {o.label}</span>
              ))}
            </div>
          </header>
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>Loại đề xuất</th>
                  <th className="num">Tổng</th>
                  <th className="num">Chấp nhận</th>
                  <th className="num">Điều chỉnh</th>
                  <th className="num">Không theo</th>
                  <th className="num">Chưa QĐ</th>
                  <th className="num">Tỉ lệ chấp nhận</th>
                  <th className="num">TB phản hồi</th>
                  <th className="bar-col">Phân bố kết quả</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.kind}>
                    <td>{row.label}</td>
                    <td className="num">{row.total}</td>
                    <td className="num">{row.kind === 'CHAT' ? '—' : row.accepted}</td>
                    <td className="num">{row.kind === 'CHAT' ? '—' : row.modified}</td>
                    <td className="num">{row.kind === 'CHAT' ? '—' : row.rejected}</td>
                    <td className="num">{row.kind === 'CHAT' ? '—' : row.pending}</td>
                    <td className="num"><strong>{row.kind === 'CHAT' ? 'Không đánh giá' : pct(row.acceptanceRate)}</strong></td>
                    <td className="num">{row.total ? `${(row.avgLatencyMs / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="bar-col">{row.kind === 'CHAT' ? null : <OutcomeBar row={row} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="ai-card">
        <header className="ai-card__head">
          <h2>Các lần phân tích gần đây <span className="ai-count">({count})</span></h2>
          <div className="ai-filters">
            <select value={filters.kind} onChange={(e) => changeFilter('kind', e.target.value)} aria-label="Lọc loại">
              <option value="">Tất cả loại</option>
              {Object.entries(AI_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => changeFilter('status', e.target.value)} aria-label="Lọc kết quả">
              <option value="">Tất cả kết quả</option>
              {Object.entries(AI_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={filters.source} onChange={(e) => changeFilter('source', e.target.value)} aria-label="Lọc nguồn">
              <option value="">Mọi nguồn</option>
              <option value="gemini">Gemini</option>
              <option value="rule">Luật dự phòng</option>
            </select>
          </div>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table ai-table--log">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Yêu cầu</th>
                <th>Loại</th>
                <th>Nội dung đề xuất</th>
                <th>Nguồn</th>
                <th>Kết quả</th>
                <th className="num">Tra cứu</th>
                <th aria-label="Mở rộng" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={8} className="ai-empty-row"><Sparkles size={16} /> Chưa có lần phân tích nào. Mở một yêu cầu và bấm “Phân tích ngay”.</td></tr>
              )}
              {items.map((item) => {
                const isOpen = expanded === item.id;
                return (
                  <Fragment key={item.id}>
                    <tr className={isOpen ? 'is-open' : ''}>
                      <td className="nowrap">{formatDateTime(item.createdAt)}<div className="muted">{item.createdBy}</div></td>
                      <td>{item.requestId ? <Link className="ai-case-link" to={`/requests/${item.requestId}`}>{item.requestId}</Link> : '—'}</td>
                      <td>{item.kindLabel}</td>
                      <td className="ai-log-summary">{outputSummary(item)}</td>
                      <td>
                        <span className={`ai-source ai-source--${item.source}`}>{item.source === 'gemini' ? 'Gemini' : 'Luật'}</span>
                        <div className="muted">{(item.latencyMs / 1000).toFixed(1)}s</div>
                      </td>
                      <td>
                        <span className={`ai-decision ai-decision--${item.status}`}>{item.statusLabel}</span>
                        {item.feedbackNote && item.status !== 'PENDING' && <div className="muted">{item.feedbackNote}</div>}
                      </td>
                      <td className="num">{item.toolTrace?.length || 0}</td>
                      <td>
                        <button type="button" className="ai-collapse" onClick={() => setExpanded(isOpen ? null : item.id)} aria-label="Chi tiết">
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="ai-log-detail">
                        <td colSpan={8}>
                          <div className="ai-log-detail__grid">
                            <div>
                              <span className="ai-kv-label">Các bước agent tra cứu</span>
                              <ol className="ai-trace__steps">
                                {(item.toolTrace || []).map((step, i) => (
                                  <li key={i}>
                                    <code>{step.tool}({Object.entries(step.args || {}).map(([k, v]) => `${k}=${v}`).join(', ')})</code>
                                    <span>{step.summary}</span>
                                    <em>{{ agent: 'AI tự gọi', system: 'Hệ thống nạp sẵn', verify: 'Hệ thống kiểm chứng số liệu', rule: 'Luật dự phòng' }[step.by] || step.by} · {step.ms}ms</em>
                                  </li>
                                ))}
                              </ol>
                              {item.error && <p className="ai-fallback-note">Ghi chú: {item.error}</p>}
                            </div>
                            <div>
                              <span className="ai-kv-label">Đầu ra (JSON) · {item.modelName || 'luật dự phòng'}</span>
                              <pre className="ai-json">{JSON.stringify(item.output, null, 2)}</pre>
                              {item.status !== 'PENDING' && item.status !== 'NOT_APPLICABLE' && (
                                <>
                                  <span className="ai-kv-label">Quyết định thực tế · {item.decidedBy} · {formatDateTime(item.decidedAt)}</span>
                                  <pre className="ai-json">{JSON.stringify(item.finalValue, null, 2)}</pre>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {count > 0 && (
          <footer className="ai-pager">
            <span className="ai-pager__info">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} / {count} bản ghi
            </span>
            {totalPages > 1 && (
              <nav className="ai-pager__nav" aria-label="Phân trang nhật ký AI">
                <button type="button" className="ai-pager__btn" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading} aria-label="Trang trước">
                  <ChevronLeft size={16} />
                </button>
                {pageList(page, totalPages).map((n) => (typeof n === 'string' ? (
                  <span key={n} className="ai-pager__gap">…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`ai-pager__btn${n === page ? ' is-active' : ''}`}
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => setPage(n)}
                    disabled={loading}
                  >
                    {n}
                  </button>
                )))}
                <button type="button" className="ai-pager__btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages || loading} aria-label="Trang sau">
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}
