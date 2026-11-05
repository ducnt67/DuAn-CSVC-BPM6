import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ExternalLink } from 'lucide-react';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Button from '../../../dung-chung/thanh-phan/Button';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { apiRequest } from '../../../ha-tang/api/apiClient';
import { assignInspector } from '../../../ha-tang/api/aiService';
import AiAssistantPanel from './AiAssistantPanel';
import './AiAssistant.css';

/** Nút "AI gợi ý" đặt trên từng dòng của các trang danh sách. */
export function AiRowButton({ onClick, label = 'AI gợi ý' }) {
  return (
    <Button
      variant="outline"
      size="sm"
      icon={Sparkles}
      className="ai-row-btn"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {label}
    </Button>
  );
}

/**
 * Khung Trợ lý AI mở từ trang danh sách. Thao tác nhanh (duyệt, trả lại, phân công) thực hiện ngay;
 * thao tác cần rà soát form (lập phương án, khảo sát...) mở trang chi tiết với form đã điền sẵn.
 * `handlers` cho phép trang danh sách tự xử lý bằng modal của chính nó.
 */
export default function AiRequestDrawer({ requestId, onClose, handlers = {} }) {
  const { requests, currentUser, refreshData, addToast } = useApp();
  const navigate = useNavigate();
  const [rejectReason, setRejectReason] = useState(null);
  const [busy, setBusy] = useState(false);
  const request = requests.find((r) => r.id === requestId);
  if (!requestId) return null;

  const run = async (action, successMessage) => {
    setBusy(true);
    try {
      await action();
      await refreshData();
      addToast(successMessage, 'success');
      onClose();
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const openDetail = (kind, output) => {
    onClose();
    navigate(`/requests/${requestId}`, { state: { aiApply: { kind, output } } });
  };

  const defaults = {
    onApprove: () => run(() => apiRequest(`/requests/${requestId}/approve/`, { method: 'POST' }), `Đã phê duyệt phương án ${requestId}`),
    onReject: (reason) => setRejectReason(reason || ''),
    onApplyAssign: (staffId) => run(
      () => apiRequest(`/requests/${requestId}/assign/`, { method: 'POST', body: { staffId } }),
      'Đã phân công cán bộ khảo sát theo đề xuất AI',
    ),
    onApplyInspector: (staffId) => run(
      () => assignInspector(requestId, staffId, 'Theo đề xuất của Trợ lý AI'),
      'Đã phân công cán bộ nghiệm thu theo đề xuất AI',
    ),
    onApplyPlan: (output) => openDetail('PLAN', output),
    onRequestInfo: (questions) => openDetail('REQUEST_INFO', questions),
    onApplySurvey: (output) => openDetail('SURVEY_ASSIST', output),
    onApplyChecklist: (output) => openDetail('ACCEPTANCE_CHECKLIST', output),
    onApplyContractor: (name) => openDetail('CONTRACTOR', name),
  };
  const merged = { ...defaults, ...handlers };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      title={`Trợ lý AI · ${requestId}`}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Đóng</Button>
          <Button variant="outline" icon={ExternalLink} onClick={() => { onClose(); navigate(`/requests/${requestId}`); }}>
            Mở hồ sơ đầy đủ
          </Button>
        </>
      )}
    >
      <div className="ai-drawer">
        {request ? (
          <>
            <div className="ai-drawer__req">
              <strong>{request.title}</strong>
              <PriorityBadge priority={request.priority} />
              <StatusBadge status={request.status} />
              <span>{request.facilityName} · {request.location} ({request.building})</span>
            </div>
            <AiAssistantPanel
              request={request}
              currentUser={currentUser}
              addToast={addToast}
              onRefresh={refreshData}
              emptyText="Ở trạng thái hiện tại, vai trò của bạn chưa có bước cần AI hỗ trợ cho yêu cầu này."
              {...merged}
            />
            {rejectReason !== null && (
              <div className="ai-drawer__reject">
                <strong>Lý do trả lại / từ chối (AI đã soạn sẵn, có thể sửa)</strong>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                <div className="ai-actions">
                  <Button
                    size="sm"
                    variant="danger"
                    loading={busy}
                    disabled={!rejectReason.trim()}
                    onClick={() => run(
                      () => apiRequest(`/requests/${requestId}/reject/`, { method: 'POST', body: { reason: rejectReason.trim() } }),
                      `Đã trả lại phương án ${requestId} cho Quản trị CSVC`,
                    )}
                  >
                    Xác nhận trả lại
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejectReason(null)}>Hủy</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="ai-hint">Không tìm thấy yêu cầu {requestId} trong phạm vi bạn được xem.</p>
        )}
      </div>
    </Modal>
  );
}
