import { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Button from '../../../dung-chung/thanh-phan/Button';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import { ISSUE_CATEGORY_LABELS } from '../../../dung-chung/hang-so/issueCategories';
import { previewTriage } from '../../../ha-tang/api/aiService';
import './AiAssistant.css';

/** Gợi ý loại sự cố & mức độ ngay khi người dùng đang soạn yêu cầu. */
export default function AiTriageHint({ draft, currentPriority, onResult, onApply }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ready = (draft.description || '').trim().length >= 8;

  const analyze = async () => {
    setLoading(true);
    setError('');
    try {
      const suggestion = await previewTriage(draft);
      setResult(suggestion);
      onResult?.(suggestion);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const output = result?.output;
  const differs = output && output.priority !== currentPriority;

  return (
    <div className="ai-hint-card">
      <div className="ai-hint-card__head">
        <strong><Sparkles size={16} /> Trợ lý AI gợi ý mức độ ưu tiên</strong>
        <Button size="sm" variant="outline" icon={Sparkles} loading={loading} disabled={!ready} onClick={analyze}>
          {result ? 'Phân tích lại' : 'Phân tích mô tả'}
        </Button>
      </div>
      {!result && !loading && (
        <p className="ai-hint">
          {ready ? 'AI sẽ đọc mô tả để gợi ý loại sự cố, mức độ và nhắc thông tin còn thiếu.' : 'Nhập mô tả (ít nhất 8 ký tự) để AI phân tích.'}
        </p>
      )}
      {error && <div className="ai-alert ai-alert--danger">{error}</div>}
      {output && (
        <>
          {output.safety_risk && (
            <div className="ai-alert ai-alert--danger">
              <AlertTriangle size={16} /> Có dấu hiệu mất an toàn. Hãy tránh xa khu vực và báo ngay cho người phụ trách tại chỗ.
            </div>
          )}
          <div className="ai-hint-card__row">
            Loại sự cố: <strong>{ISSUE_CATEGORY_LABELS[output.category] || output.category}</strong>
            <span>·</span> Mức độ đề xuất: <PriorityBadge priority={output.priority} />
          </div>
          <p>{output.priority_reason}</p>
          {output.missing_info?.length > 0 && (
            <div>
              <span className="ai-kv-label">Nên bổ sung vào mô tả</span>
              <ul className="ai-list ai-list--dot">{output.missing_info.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {output.possible_duplicates?.length > 0 && (
            <div className="ai-alert ai-alert--warning">
              Bạn đã có yêu cầu tương tự đang xử lý: {output.possible_duplicates.map((d) => d.code).join(', ')}.
            </div>
          )}
          <div className="ai-hint-card__row">
            {differs ? (
              <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => onApply(output)}>
                Áp dụng mức độ AI gợi ý
              </Button>
            ) : (
              <span className="ai-kv-sub"><CheckCircle2 size={14} /> Mức độ bạn chọn khớp với gợi ý.</span>
            )}
            <span className="ai-hint">Bạn vẫn có thể tự chọn mức độ; Quản trị CSVC sẽ xác nhận lại.</span>
          </div>
        </>
      )}
    </div>
  );
}
