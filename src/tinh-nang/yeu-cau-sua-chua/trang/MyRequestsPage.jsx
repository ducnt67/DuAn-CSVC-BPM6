import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS } from '../../../dung-chung/hang-so/statuses';
import { PlusCircle, Eye, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';

export default function MyRequestsPage() {
  const { requests, currentUser, updateRequest, addToast } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Confirmation modal state (for internal repair)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmResult, setConfirmResult] = useState('PASS'); // 'PASS' or 'FAIL'
  const [confirmFeedback, setConfirmFeedback] = useState('');

  // Supplement info modal state
  const [supplementModalOpen, setSupplementModalOpen] = useState(false);
  const [supplementText, setSupplementText] = useState('');

  // Requester's requests
  const myRequests = useMemo(() => {
    return requests.filter((r) => {
      // If demo user is requester, match requesterId
      if (currentUser?.id && r.requesterId !== currentUser.id) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.id.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q)) return false;
      }
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });
  }, [requests, currentUser, search, statusFilter]);

  // Handle Internal Repair Confirmation (Requester confirms if it's satisfactory)
  const handleConfirmInternal = () => {
    if (confirmResult === 'PASS') {
      updateRequest(selectedRequest.id, {
        status: REQUEST_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        timeline: [
          ...(selectedRequest.timeline || []),
          {
            stage: 'Xác nhận hoàn thành',
            status: 'COMPLETED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            note: `Người yêu cầu đã nghiệm thu & xác nhận hài lòng: "${confirmFeedback || 'Đã sửa chữa tốt'}"`,
          },
        ],
        history: [
          ...(selectedRequest.history || []),
          {
            action: 'Xác nhận hoàn thành sửa chữa nội bộ',
            performedBy: currentUser.name,
            timestamp: new Date().toISOString(),
            note: confirmFeedback || 'Đạt yêu cầu sử dụng bình thường',
          },
        ],
      });
      addToast(`Đã xác nhận hoàn thành yêu cầu ${selectedRequest.id}`, 'success');
    } else {
      // If failed, send feedback back to staff
      if (!confirmFeedback.trim()) {
        addToast('Vui lòng nêu rõ lý do chưa đạt yêu cầu', 'error');
        return;
      }
      updateRequest(selectedRequest.id, {
        status: REQUEST_STATUS.INTERNAL_REPAIR,
        timeline: [
          ...(selectedRequest.timeline || []),
          {
            stage: 'Phản hồi kết quả chưa đạt',
            status: 'IN_PROGRESS',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            note: `Người yêu cầu phản hồi chưa đạt: ${confirmFeedback}`,
          },
        ],
        history: [
          ...(selectedRequest.history || []),
          {
            action: 'Phản hồi chưa đạt kết quả sửa chữa',
            performedBy: currentUser.name,
            timestamp: new Date().toISOString(),
            note: confirmFeedback,
          },
        ],
      });
      addToast(`Đã gửi phản hồi yêu cầu tiếp tục xử lý cho ${selectedRequest.id}`, 'warning');
    }
    setConfirmModalOpen(false);
  };

  // Handle supplement info
  const handleSupplement = () => {
    if (!supplementText.trim()) {
      addToast('Vui lòng nhập nội dung thông tin bổ sung', 'error');
      return;
    }
    updateRequest(selectedRequest.id, {
      status: REQUEST_STATUS.ACCEPTED,
      timeline: [
        ...(selectedRequest.timeline || []),
        {
          stage: 'Bổ sung thông tin',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `Đã bổ sung: ${supplementText}`,
        },
      ],
      history: [
        ...(selectedRequest.history || []),
        {
          action: 'Bổ sung thông tin yêu cầu',
          performedBy: currentUser.name,
          timestamp: new Date().toISOString(),
          note: supplementText,
        },
      ],
    });
    addToast(`Đã cập nhật bổ sung thông tin cho yêu cầu ${selectedRequest.id}`, 'success');
    setSupplementModalOpen(false);
  };

  const columns = [
    {
      title: 'Mã YC',
      field: 'id',
      sortable: true,
      width: '110px',
      render: (val) => <span style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{val}</span>,
    },
    {
      title: 'Tiêu đề sự cố',
      field: 'title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {row.facilityName} ({row.location})
          </div>
        </div>
      ),
    },
    {
      title: 'Mức độ',
      field: 'priority',
      width: '120px',
      render: (val) => <PriorityBadge priority={val} />,
    },
    {
      title: 'Cán bộ kỹ thuật',
      field: 'assignedStaffName',
      render: (val) => val || <span style={{ color: 'var(--color-text-tertiary)' }}>Đang chờ phân công</span>,
    },
    {
      title: 'Trạng thái',
      field: 'status',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
    {
      title: 'Ngày tạo',
      field: 'createdAt',
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      title: 'Thao tác',
      align: 'right',
      render: (_, row) => {
        const isWaitingConfirmation =
          row.repairType === 'INTERNAL' && row.status === REQUEST_STATUS.WAITING_FOR_CONFIRMATION;
        const isNeedsInfo = row.status === REQUEST_STATUS.NEEDS_INFORMATION;

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            {isWaitingConfirmation && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRequest(row);
                  setConfirmResult('PASS');
                  setConfirmFeedback('');
                  setConfirmModalOpen(true);
                }}
              >
                Xác nhận kết quả
              </Button>
            )}

            {isNeedsInfo && (
              <Button
                variant="warning"
                size="sm"
                icon={MessageSquare}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRequest(row);
                  setSupplementText('');
                  setSupplementModalOpen(true);
                }}
              >
                Bổ sung thông tin
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={() => navigate(`/requests/${row.id}`)}
            >
              Chi tiết
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Yêu cầu sửa chữa của tôi"
        description="Theo dõi toàn bộ các yêu cầu sửa chữa cơ sở vật chất do bạn khởi tạo"
        actions={
          <Button
            variant="primary"
            icon={PlusCircle}
            onClick={() => navigate('/requests/create')}
          >
            Tạo yêu cầu mới
          </Button>
        }
      />

      <FilterBar onReset={() => { setSearch(''); setStatusFilter(''); }} hasActiveFilters={Boolean(search || statusFilter)}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã hoặc tiêu đề yêu cầu..."
          style={{ width: 280 }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-control"
          style={{ width: 200 }}
        >
          <option value="">-- Tất cả trạng thái --</option>
          <option value={REQUEST_STATUS.NEW}>Mới gửi</option>
          <option value={REQUEST_STATUS.NEEDS_INFORMATION}>Chờ bổ sung thông tin</option>
          <option value={REQUEST_STATUS.INTERNAL_REPAIR}>Đang xử lý nội bộ</option>
          <option value={REQUEST_STATUS.WAITING_FOR_CONFIRMATION}>Chờ bạn xác nhận kết quả</option>
          <option value={REQUEST_STATUS.COMPLETED}>Đã hoàn thành</option>
        </select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={myRequests}
        keyField="id"
        pageSize={8}
        onRowClick={(row) => navigate(`/requests/${row.id}`)}
        emptyTitle="Bạn chưa có yêu cầu nào"
        emptyDescription="Nếu cơ sở vật chất, thiết bị phòng học hoặc phòng làm việc gặp sự cố, hãy tạo yêu cầu ngay."
        emptyActionLabel="Tạo yêu cầu sửa chữa ngay"
        onEmptyAction={() => navigate('/requests/create')}
      />

      {/* Requester Confirm Internal Repair Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={`Xác nhận kết quả sửa chữa nội bộ: ${selectedRequest?.id}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant={confirmResult === 'PASS' ? 'primary' : 'danger'}
              onClick={handleConfirmInternal}
            >
              {confirmResult === 'PASS' ? 'Xác nhận hài lòng & Hoàn thành' : 'Gửi phản hồi yêu cầu sửa lại'}
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
            {selectedRequest?.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Cán bộ phụ trách: <strong>{selectedRequest?.assignedStaffName}</strong> đã hoàn thành sửa chữa nội bộ và đề nghị kiểm tra xác nhận.
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Đánh giá kết quả kiểm tra thực tế:</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${confirmResult === 'PASS' ? 'var(--color-green)' : 'var(--color-border)'}`,
                backgroundColor: confirmResult === 'PASS' ? 'var(--color-green-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: confirmResult === 'PASS' ? 'var(--color-green)' : 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="confirmResult"
                checked={confirmResult === 'PASS'}
                onChange={() => setConfirmResult('PASS')}
              />
              Đã hoạt động tốt (Đạt)
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${confirmResult === 'FAIL' ? 'var(--color-danger)' : 'var(--color-border)'}`,
                backgroundColor: confirmResult === 'FAIL' ? 'var(--color-danger-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: confirmResult === 'FAIL' ? 'var(--color-danger)' : 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="confirmResult"
                checked={confirmResult === 'FAIL'}
                onChange={() => setConfirmResult('FAIL')}
              />
              Vẫn còn lỗi / Chưa đạt
            </label>
          </div>
        </div>

        <Textarea
          label={confirmResult === 'PASS' ? 'Nhận xét thêm (không bắt buộc)' : 'Mô tả chi tiết điểm chưa đạt (bắt buộc)'}
          required={confirmResult === 'FAIL'}
          value={confirmFeedback}
          onChange={(e) => setConfirmFeedback(e.target.value)}
          placeholder={confirmResult === 'PASS' ? 'Thiết bị đã bật tốt, hoạt động êm ái.' : 'Thiết bị vẫn phát ra tiếng ồn hoặc chưa lên nguồn...'}
          rows={3}
        />
      </Modal>

      {/* Supplement Info Modal */}
      <Modal
        isOpen={supplementModalOpen}
        onClose={() => setSupplementModalOpen(false)}
        title={`Bổ sung thông tin cho yêu cầu: ${selectedRequest?.id}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSupplementModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSupplement}>
              Gửi bổ sung
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
            {selectedRequest?.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)' }}>
            Quản trị CSVC đề nghị bổ sung chi tiết để có căn cứ khảo sát và phê duyệt phương án.
          </div>
        </div>

        <Textarea
          label="Nội dung thông tin bổ sung"
          required
          value={supplementText}
          onChange={(e) => setSupplementText(e.target.value)}
          placeholder="Nhập thời gian phát sinh cụ thể, mã hiệu model thiết bị hoặc chỉ dẫn vị trí chính xác..."
          rows={4}
        />
      </Modal>
    </div>
  );
}

