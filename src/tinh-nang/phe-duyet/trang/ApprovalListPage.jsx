import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS, REPAIR_TYPE, APPROVAL_STATUS } from '../../../dung-chung/hang-so/statuses';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import { ShieldCheck, CheckCircle2, XCircle, Eye, DollarSign, Calendar, Clock } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import Button from '../../../dung-chung/thanh-phan/Button';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatCurrency } from '../../../dung-chung/tien-ich/formatCurrency';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';

export default function ApprovalListPage() {
  const {
    repairPlans, requests, updateRepairPlan, updateRequest,
    currentUser, addToast, addExternalWork, externalWorks
  } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, APPROVED, REJECTED
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Filter plans by tab
  const filteredPlans = useMemo(() => {
    return repairPlans.filter((p) => {
      if (activeTab === 'PENDING') return p.approvalStatus === APPROVAL_STATUS.PENDING;
      if (activeTab === 'APPROVED') return p.approvalStatus === APPROVAL_STATUS.APPROVED;
      if (activeTab === 'REJECTED') return p.approvalStatus === APPROVAL_STATUS.REJECTED;
      return true;
    });
  }, [repairPlans, activeTab]);

  // Handle Approve
  const handleApprovePlan = (plan, e) => {
    if (e) e.stopPropagation();
    const relatedRequest = requests.find((r) => r.id === plan.requestId);
    const nextStatus =
      plan.repairType === REPAIR_TYPE.INTERNAL
        ? REQUEST_STATUS.INTERNAL_REPAIR
        : REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK;

    updateRepairPlan(plan.id, {
      approvalStatus: APPROVAL_STATUS.APPROVED,
      approvedBy: currentUser?.name || 'Ban Giám hiệu',
      approvedAt: new Date().toISOString(),
    });

    if (relatedRequest) {
      if (plan.repairType === REPAIR_TYPE.EXTERNAL) {
        // Ensure external work item exists
        const workExists = externalWorks.some((w) => w.requestId === relatedRequest.id);
        if (!workExists) {
          addExternalWork({
            id: `TN-${Date.now().toString().slice(-4)}`,
            requestId: relatedRequest.id,
            planId: plan.id,
            title: plan.title,
            contractor: 'Đang lựa chọn nhà thầu',
            status: 'PENDING',
            progress: 0,
            estimatedCost: plan.estimatedCost,
            assignedToProcurement: true,
            createdAt: new Date().toISOString(),
          });
        }
      }

      updateRequest(relatedRequest.id, {
        status: nextStatus,
        approvalStatus: APPROVAL_STATUS.APPROVED,
        approvedBy: currentUser?.name || 'Ban Giám hiệu',
        approvedAt: new Date().toISOString(),
        timeline: [
          ...(relatedRequest.timeline || []),
          {
            stage: 'Phê duyệt phương án',
            status: 'COMPLETED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Ban Giám hiệu',
            note: 'Ban Giám hiệu đã phê duyệt chủ trương và kinh phí thực hiện',
          },
        ],
        history: [
          ...(relatedRequest.history || []),
          {
            action: 'Phê duyệt phương án',
            performedBy: currentUser?.name || 'Ban Giám hiệu',
            timestamp: new Date().toISOString(),
            note: `Đồng ý thực hiện phương án ${plan.id}. Kinh phí: ${formatCurrency(plan.estimatedCost)}`,
          },
        ],
      });
    }

    addToast(`Đã phê duyệt phương án ${plan.id}`, 'success');
    if (detailModalOpen) setDetailModalOpen(false);
  };

  // Open Reject Modal
  const openRejectModal = (plan, e) => {
    if (e) e.stopPropagation();
    setSelectedPlan(plan);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  // Confirm Reject with reason
  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      addToast('Bắt buộc phải nhập lý do từ chối', 'error');
      return;
    }

    const relatedRequest = requests.find((r) => r.id === selectedPlan.requestId);

    updateRepairPlan(selectedPlan.id, {
      approvalStatus: APPROVAL_STATUS.REJECTED,
      rejectedBy: currentUser?.name || 'Ban Giám hiệu',
      rejectedAt: new Date().toISOString(),
      rejectionReason: rejectReason,
    });

    if (relatedRequest) {
      updateRequest(relatedRequest.id, {
        status: REQUEST_STATUS.WAITING_FOR_PLAN,
        approvalStatus: APPROVAL_STATUS.REJECTED,
        rejectionReason: rejectReason,
        timeline: [
          ...(relatedRequest.timeline || []),
          {
            stage: 'Từ chối phương án',
            status: 'FAILED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Ban Giám hiệu',
            note: `BGH từ chối: ${rejectReason}. Yêu cầu lập lại phương án.`,
          },
        ],
        history: [
          ...(relatedRequest.history || []),
          {
            action: 'Từ chối phương án',
            performedBy: currentUser?.name || 'Ban Giám hiệu',
            timestamp: new Date().toISOString(),
            note: `Lý do từ chối: ${rejectReason}`,
          },
        ],
      });
    }

    addToast(`Đã từ chối phương án ${selectedPlan.id}`, 'warning');
    setRejectModalOpen(false);
    if (detailModalOpen) setDetailModalOpen(false);
  };

  const openDetailModal = (plan, e) => {
    if (e) e.stopPropagation();
    setSelectedPlan(plan);
    setDetailModalOpen(true);
  };

  const columns = [
    {
      title: 'Mã PA',
      field: 'id',
      sortable: true,
      width: '110px',
      render: (val) => <span style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{val}</span>,
    },
    {
      title: 'Mã YC',
      field: 'requestId',
      sortable: true,
      width: '110px',
      render: (val) => <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{val}</span>,
    },
    {
      title: 'Tiêu đề phương án',
      field: 'title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Hình thức: <strong>{row.repairType === REPAIR_TYPE.INTERNAL ? 'Sửa chữa nội bộ' : 'Thuê ngoài'}</strong> • TG: {row.estimatedDuration}
          </div>
        </div>
      ),
    },
    {
      title: 'Dự toán kinh phí',
      field: 'estimatedCost',
      sortable: true,
      render: (val) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Người đề xuất',
      field: 'proposedBy',
      render: (val, row) => (
        <div>
          <div>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{formatDate(row.proposedAt)}</div>
        </div>
      ),
    },
    {
      title: 'Thao tác phê duyệt',
      align: 'right',
      render: (_, row) => {
        const isDirector = currentUser?.role === ROLES.DIRECTOR;
        const isPending = row.approvalStatus === APPROVAL_STATUS.PENDING;

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            {isDirector && isPending && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={(e) => handleApprovePlan(row, e)}
                >
                  Duyệt
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={(e) => openRejectModal(row, e)}
                >
                  Từ chối
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={(e) => openDetailModal(row, e)}
            >
              Xem chi tiết
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Phê duyệt phương án sửa chữa"
        description="Thẩm quyền Ban Giám hiệu: xem xét phương án kỹ thuật, dự toán kinh phí và phê duyệt chủ trương"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'PENDING', label: 'Chờ phê duyệt', color: '#D97B0D' },
          { key: 'APPROVED', label: 'Đã phê duyệt', color: '#229A58' },
          { key: 'REJECTED', label: 'Bị từ chối', color: '#D64545' },
        ].map((tab) => {
          const count = repairPlans.filter((p) => p.approvalStatus === tab.key).length;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isActive ? 'var(--color-blue)' : 'var(--color-border)'}`,
                backgroundColor: isActive ? 'var(--color-blue-light)' : 'var(--color-white)',
                color: isActive ? 'var(--color-blue)' : 'var(--color-text)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '1px 8px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  backgroundColor: isActive ? 'var(--color-blue)' : 'var(--color-surface-muted)',
                  color: isActive ? '#FFF' : 'var(--color-text-secondary)',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={filteredPlans}
        keyField="id"
        pageSize={8}
        onRowClick={(row) => openDetailModal(row)}
        emptyTitle={`Không có phương án nào ${activeTab === 'PENDING' ? 'đang chờ phê duyệt' : activeTab === 'APPROVED' ? 'đã phê duyệt' : 'bị từ chối'}`}
        emptyDescription="Danh sách sẽ hiển thị khi có phương án phát sinh theo quy trình."
      />

      {/* Detail Modal */}
      {selectedPlan && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Chi tiết phương án sửa chữa: ${selectedPlan.id}`}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </Button>
              {currentUser?.role === ROLES.DIRECTOR && selectedPlan.approvalStatus === APPROVAL_STATUS.PENDING && (
                <>
                  <Button variant="danger" icon={XCircle} onClick={() => openRejectModal(selectedPlan)}>
                    Từ chối
                  </Button>
                  <Button variant="success" icon={CheckCircle2} onClick={() => handleApprovePlan(selectedPlan)}>
                    Phê duyệt phương án
                  </Button>
                </>
              )}
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Tiêu đề phương án</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>{selectedPlan.title}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: 16, backgroundColor: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Mã yêu cầu:</span>
                <div style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{selectedPlan.requestId}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Hình thức thực hiện:</span>
                <div style={{ fontWeight: 600 }}>{selectedPlan.repairType === REPAIR_TYPE.INTERNAL ? 'Sửa chữa nội bộ' : 'Thuê ngoài'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Dự toán kinh phí:</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>{formatCurrency(selectedPlan.estimatedCost)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Thời gian thực hiện:</span>
                <div style={{ fontWeight: 600 }}>{selectedPlan.estimatedDuration}</div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>Vật tư / Thiết bị dự kiến thay thế:</span>
              <div style={{ fontSize: '0.875rem', marginTop: 4, padding: 12, backgroundColor: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                {selectedPlan.materials || 'Vật tư tiêu chuẩn theo báo giá'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>Ghi chú kỹ thuật:</span>
              <div style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--color-text-secondary)' }}>
                {selectedPlan.description || 'Đã kiểm tra kỹ các thông số điện áp và an toàn phòng chống cháy nổ.'}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title={`Từ chối phê duyệt phương án: ${selectedPlan?.id}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleConfirmReject}>
              Xác nhận từ chối
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 12, fontSize: '0.875rem', color: 'var(--color-text)' }}>
          Phương án: <strong>{selectedPlan?.title}</strong> (Dự toán: {formatCurrency(selectedPlan?.estimatedCost || 0)})
        </div>
        <Textarea
          label="Lý do từ chối phê duyệt (bắt buộc)"
          required
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Dự toán chi phí vượt định mức, yêu cầu cán bộ lập lại phương án hoặc tìm giải pháp thay thế..."
        />
      </Modal>
    </div>
  );
}

