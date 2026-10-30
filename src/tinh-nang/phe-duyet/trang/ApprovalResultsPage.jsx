import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { APPROVAL_STATUS, APPROVAL_LABELS, REPAIR_TYPE, REPAIR_TYPE_LABELS } from '../../../dung-chung/hang-so/statuses';
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Eye,
  Search, ArrowRight, DollarSign, Calendar, Building,
  AlertCircle, FileText, Check, MessageSquare
} from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import Button from '../../../dung-chung/thanh-phan/Button';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import { formatCurrency } from '../../../dung-chung/tien-ich/formatCurrency';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';

export default function ApprovalResultsPage() {
  const { repairPlans, requests } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('ALL'); // ALL, APPROVED, PENDING, REJECTED
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Combine repairPlans with related request data
  const enrichedPlans = useMemo(() => {
    // Filter only plans that require approval or have approval records
    return repairPlans
      .filter((p) => p.needsApproval || p.approvalStatus || (p.approvalHistory && p.approvalHistory.length > 0))
      .map((p) => {
        const req = requests.find((r) => r.id === p.requestId) || {};
        return {
          ...p,
          facilityName: req.facilityName || 'Chưa xác định',
          location: req.location || req.building || '—',
          requesterName: req.requesterName || '—',
          requestStatus: req.status,
          priority: req.priority,
        };
      });
  }, [repairPlans, requests]);

  // Summary counts
  const stats = useMemo(() => {
    const total = enrichedPlans.length;
    const approved = enrichedPlans.filter((p) => p.approvalStatus === APPROVAL_STATUS.APPROVED).length;
    const pending = enrichedPlans.filter((p) => p.approvalStatus === APPROVAL_STATUS.PENDING).length;
    const rejected = enrichedPlans.filter((p) => p.approvalStatus === APPROVAL_STATUS.REJECTED).length;

    const approvedCost = enrichedPlans
      .filter((p) => p.approvalStatus === APPROVAL_STATUS.APPROVED)
      .reduce((sum, p) => sum + (Number(p.estimatedCost) || 0), 0);

    return { total, approved, pending, rejected, approvedCost };
  }, [enrichedPlans]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return enrichedPlans.filter((p) => {
      // Tab filter
      if (activeTab === 'APPROVED' && p.approvalStatus !== APPROVAL_STATUS.APPROVED) return false;
      if (activeTab === 'PENDING' && p.approvalStatus !== APPROVAL_STATUS.PENDING) return false;
      if (activeTab === 'REJECTED' && p.approvalStatus !== APPROVAL_STATUS.REJECTED) return false;

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = (p.id || '').toLowerCase().includes(q);
        const matchReqId = (p.requestId || '').toLowerCase().includes(q);
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchFacility = (p.facilityName || '').toLowerCase().includes(q);
        const matchCreator = (p.createdByName || p.proposedBy || '').toLowerCase().includes(q);
        const matchApprover = (p.approvedByName || p.approvedBy || '').toLowerCase().includes(q);
        if (!matchId && !matchReqId && !matchTitle && !matchFacility && !matchCreator && !matchApprover) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedPlans, activeTab, search]);

  const handleOpenDetail = (plan, e) => {
    if (e) e.stopPropagation();
    setSelectedPlan(plan);
    setDetailModalOpen(true);
  };

  const renderApprovalBadge = (status) => {
    if (status === APPROVAL_STATUS.APPROVED) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 6,
            backgroundColor: '#E9F8EF',
            color: '#229A58',
            border: '1px solid #B0E0C8',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={13} />
          Đã phê duyệt
        </span>
      );
    }
    if (status === APPROVAL_STATUS.REJECTED) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 6,
            backgroundColor: '#FFF0F0',
            color: '#D64545',
            border: '1px solid #F5B8B8',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          <XCircle size={13} />
          Bị từ chối
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 6,
          backgroundColor: '#FFF1E5',
          color: '#D97B0D',
          border: '1px solid #F5D4A8',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        <Clock size={13} />
        Chờ phê duyệt
      </span>
    );
  };

  const columns = [
    {
      title: 'Mã PA',
      field: 'id',
      sortable: true,
      width: '105px',
      render: (val) => (
        <span style={{ fontWeight: 700, color: 'var(--color-blue)', fontFamily: 'monospace' }}>
          {val}
        </span>
      ),
    },
    {
      title: 'Mã YC',
      field: 'requestId',
      sortable: true,
      width: '105px',
      render: (val) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/requests/${val}`);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
            fontSize: '0.8125rem',
          }}
          title="Xem chi tiết yêu cầu gốc"
        >
          {val}
        </button>
      ),
    },
    {
      title: 'Phương án & Cơ sở vật chất',
      field: 'title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.35 }}>
            {val}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 3 }}>
            <strong>{row.facilityName}</strong> • {row.location}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Hình thức: <strong>{row.repairType === REPAIR_TYPE.INTERNAL ? 'Nội bộ' : 'Thuê ngoài'}</strong> • Dự kiến: {row.estimatedTime || row.estimatedDuration || '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Dự toán kinh phí',
      field: 'estimatedCost',
      sortable: true,
      width: '135px',
      render: (val) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.9rem' }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: 'Người đề xuất',
      field: 'createdByName',
      width: '140px',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{val || row.proposedBy || 'Lê Hoàng Nam'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {formatDate(row.createdAt || row.proposedAt)}
          </div>
        </div>
      ),
    },
    {
      title: 'Kết quả phê duyệt',
      field: 'approvalStatus',
      sortable: true,
      width: '145px',
      render: (val) => renderApprovalBadge(val),
    },
    {
      title: 'Ý kiến chỉ đạo / Lý do BGH',
      field: 'rejectionReason',
      render: (val, row) => {
        if (row.approvalStatus === APPROVAL_STATUS.REJECTED) {
          return (
            <div
              style={{
                fontSize: '0.78125rem',
                color: '#D64545',
                lineHeight: 1.35,
                backgroundColor: '#FFF5F5',
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid #FED7D7',
                maxWidth: 220,
              }}
              title={val}
            >
              <strong>Lý do:</strong> {val || 'Không đồng ý phương án'}
            </div>
          );
        }
        if (row.approvalStatus === APPROVAL_STATUS.APPROVED) {
          const comment = row.approvalHistory?.find(h => h.comments)?.comments || 'Đồng ý chủ trương và kinh phí thực hiện';
          return (
            <div
              style={{
                fontSize: '0.78125rem',
                color: '#15803D',
                lineHeight: 1.35,
                backgroundColor: '#F0FDF4',
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid #BBF7D0',
                maxWidth: 220,
              }}
              title={comment}
            >
              <strong>Chỉ đạo:</strong> {comment}
            </div>
          );
        }
        return (
          <span style={{ fontSize: '0.78125rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
            Đang chờ Ban Giám hiệu xem xét
          </span>
        );
      },
    },
    {
      title: 'Thời gian phê duyệt',
      field: 'approvedAt',
      sortable: true,
      width: '140px',
      render: (val, row) => {
        if (!val && !row.approvedByName) {
          return <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>;
        }
        return (
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text)' }}>
              {row.approvedByName || 'Ban Giám hiệu'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {val ? formatDate(val) : '—'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      align: 'right',
      width: '100px',
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={(e) => handleOpenDetail(row, e)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kết quả phê duyệt của Ban Giám hiệu"
        description="Theo dõi danh sách các phương án sửa chữa trình Ban Giám hiệu và kết quả xem xét, phê duyệt, ý kiến chỉ đạo"
      />

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: 'var(--color-due-blue-light)',
              color: 'var(--color-due-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
              Tổng phương án trình duyệt
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.15 }}>
              {stats.total}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #B0E0C8',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#E9F8EF',
              color: '#229A58',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803D', textTransform: 'uppercase' }}>
              Đã phê duyệt
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#229A58', lineHeight: 1.15 }}>
              {stats.approved}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Kinh phí: <strong>{formatCurrency(stats.approvedCost)}</strong>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #F5D4A8',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#FFF1E5',
              color: '#D97B0D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309', textTransform: 'uppercase' }}>
              Đang chờ phê duyệt
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#D97B0D', lineHeight: 1.15 }}>
              {stats.pending}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Cần BGH xem xét duyệt
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #F5B8B8',
            padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#FFF0F0',
              color: '#D64545',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B91C1C', textTransform: 'uppercase' }}>
              Bị từ chối
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#D64545', lineHeight: 1.15 }}>
              {stats.rejected}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Cần lập lại phương án
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'Tất cả phương án', count: stats.total, color: 'var(--color-blue)' },
            { key: 'APPROVED', label: 'Đã phê duyệt', count: stats.approved, color: '#229A58' },
            { key: 'PENDING', label: 'Chờ phê duyệt', count: stats.pending, color: '#D97B0D' },
            { key: 'REJECTED', label: 'Bị từ chối', count: stats.rejected, color: '#D64545' },
          ].map((tab) => {
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
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isActive ? 'var(--color-blue)' : 'var(--color-border)'}`,
                  backgroundColor: isActive ? 'var(--color-blue-light)' : 'var(--color-white)',
                  color: isActive ? 'var(--color-blue)' : 'var(--color-text)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    padding: '1px 7px',
                    borderRadius: 12,
                    fontSize: '0.6875rem',
                    backgroundColor: isActive ? 'var(--color-blue)' : 'var(--color-surface-muted)',
                    color: isActive ? '#FFF' : 'var(--color-text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã PA, mã YC, tên phương án, thiết bị..."
          style={{ width: 300 }}
        />
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={filteredPlans}
        keyField="id"
        pageSize={8}
        onRowClick={(row) => handleOpenDetail(row)}
        emptyTitle={`Không tìm thấy kết quả phê duyệt nào`}
        emptyDescription={search ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác.' : 'Chưa có phương án nào cần phê duyệt từ Ban Giám hiệu.'}
      />

      {/* Detail Modal */}
      {selectedPlan && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Chi tiết kết quả phê duyệt: ${selectedPlan.id}`}
          size="lg"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Button
                variant="outline"
                icon={FileText}
                onClick={() => {
                  setDetailModalOpen(false);
                  navigate(`/requests/${selectedPlan.requestId}`);
                }}
              >
                Xem chi tiết yêu cầu gốc ({selectedPlan.requestId})
              </Button>
              <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Approval Result Banner */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                backgroundColor:
                  selectedPlan.approvalStatus === APPROVAL_STATUS.APPROVED
                    ? '#F0FDF4'
                    : selectedPlan.approvalStatus === APPROVAL_STATUS.REJECTED
                    ? '#FEF2F2'
                    : '#FFFBEB',
                border: `1px solid ${
                  selectedPlan.approvalStatus === APPROVAL_STATUS.APPROVED
                    ? '#BBF7D0'
                    : selectedPlan.approvalStatus === APPROVAL_STATUS.REJECTED
                    ? '#FECACA'
                    : '#FDE68A'
                }`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{ marginTop: 2 }}>
                {selectedPlan.approvalStatus === APPROVAL_STATUS.APPROVED && (
                  <CheckCircle2 size={22} color="#16A34A" />
                )}
                {selectedPlan.approvalStatus === APPROVAL_STATUS.REJECTED && (
                  <XCircle size={22} color="#DC2626" />
                )}
                {selectedPlan.approvalStatus === APPROVAL_STATUS.PENDING && (
                  <Clock size={22} color="#D97706" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color:
                        selectedPlan.approvalStatus === APPROVAL_STATUS.APPROVED
                          ? '#15803D'
                          : selectedPlan.approvalStatus === APPROVAL_STATUS.REJECTED
                          ? '#B91C1C'
                          : '#B45309',
                    }}
                  >
                    {selectedPlan.approvalStatus === APPROVAL_STATUS.APPROVED && 'BAN GIÁM HIỆU ĐÃ PHÊ DUYỆT PHƯƠNG ÁN'}
                    {selectedPlan.approvalStatus === APPROVAL_STATUS.REJECTED && 'BAN GIÁM HIỆU ĐÃ TỪ CHỐI PHƯƠNG ÁN'}
                    {selectedPlan.approvalStatus === APPROVAL_STATUS.PENDING && 'PHƯƠNG ÁN ĐANG CHỜ BAN GIÁM HIỆU PHÊ DUYỆT'}
                  </div>
                  {selectedPlan.approvedAt && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      Thời gian: {formatDate(selectedPlan.approvedAt)}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.8125rem', marginTop: 4, color: 'var(--color-text)' }}>
                  <strong>Người phê duyệt:</strong> {selectedPlan.approvedByName || selectedPlan.approvedBy || 'Ban Giám hiệu Trường'}
                </div>

                {selectedPlan.rejectionReason && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 6,
                      border: '1px solid #FECACA',
                      fontSize: '0.8125rem',
                      color: '#B91C1C',
                    }}
                  >
                    <strong>Lý do từ chối:</strong> {selectedPlan.rejectionReason}
                  </div>
                )}

                {selectedPlan.approvalHistory && selectedPlan.approvalHistory.find(h => h.comments) && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 10,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 6,
                      border: '1px solid #BBF7D0',
                      fontSize: '0.8125rem',
                      color: '#15803D',
                    }}
                  >
                    <strong>Ý kiến chỉ đạo từ Ban Giám hiệu:</strong>{' '}
                    {selectedPlan.approvalHistory.find(h => h.comments)?.comments}
                  </div>
                )}
              </div>
            </div>

            {/* General Plan Info */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Tiêu đề phương án kỹ thuật
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', marginTop: 2 }}>
                {selectedPlan.title}
              </div>
            </div>

            {/* Quick Grid Info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12,
                padding: 16,
                backgroundColor: 'var(--color-surface-muted)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Mã yêu cầu gốc:</span>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{selectedPlan.requestId}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Cơ sở vật chất:</span>
                <div style={{ fontWeight: 600 }}>{selectedPlan.facilityName} ({selectedPlan.location})</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Hình thức thực hiện:</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedPlan.repairType === REPAIR_TYPE.INTERNAL ? 'Sửa chữa nội bộ' : 'Thuê ngoài đơn vị chuyên môn'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Dự toán kinh phí:</span>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-primary)' }}>
                  {formatCurrency(selectedPlan.estimatedCost)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Thời gian thực hiện:</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedPlan.estimatedTime || selectedPlan.estimatedDuration || '7 ngày làm việc'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Cán bộ lập phương án:</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedPlan.createdByName || selectedPlan.proposedBy || 'Lê Hoàng Nam'} ({formatDate(selectedPlan.createdAt || selectedPlan.proposedAt)})
                </div>
              </div>
            </div>

            {/* Materials & Description */}
            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Vật tư, linh kiện & thiết bị thay thế dự kiến:
              </span>
              <div
                style={{
                  fontSize: '0.875rem',
                  marginTop: 6,
                  padding: 12,
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {selectedPlan.materials || 'Vật tư theo phương án kỹ thuật và báo giá nhà cung cấp.'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Nội dung chi tiết giải pháp kỹ thuật:
              </span>
              <div
                style={{
                  fontSize: '0.875rem',
                  marginTop: 6,
                  padding: 12,
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  lineHeight: 1.5,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {selectedPlan.description || 'Phương án đảm bảo đúng quy chuẩn kỹ thuật và định mức chi phí trường Đại học Kinh tế.'}
              </div>
            </div>

            {/* Approval History Log */}
            {selectedPlan.approvalHistory && selectedPlan.approvalHistory.length > 0 && (
              <div>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Nhật ký quá trình trình duyệt & phê duyệt:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {selectedPlan.approvalHistory.map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-surface-muted)',
                        borderRadius: 6,
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div>
                        <strong>{h.action}</strong> bởi <strong>{h.actor}</strong>
                        {h.comments && <span style={{ color: 'var(--color-text-secondary)' }}>: "{h.comments}"</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        {formatDate(h.date)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
