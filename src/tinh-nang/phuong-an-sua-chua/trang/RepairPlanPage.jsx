import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { APPROVAL_STATUS, APPROVAL_LABELS, REPAIR_TYPE_LABELS } from '../../../dung-chung/hang-so/statuses';
import { FileText, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import { formatCurrency } from '../../../dung-chung/tien-ich/formatCurrency';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';

export default function RepairPlanPage() {
  const { repairPlans, requests } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');

  const filteredPlans = useMemo(() => {
    return repairPlans.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.id.toLowerCase().includes(q) && !p.title.toLowerCase().includes(q) && !p.requestId.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (approvalFilter && p.approvalStatus !== approvalFilter) return false;
      return true;
    });
  }, [repairPlans, search, approvalFilter]);

  const columns = [
    {
      title: 'Mã PA',
      field: 'id',
      sortable: true,
      width: '110px',
      render: (val) => <span style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{val}</span>,
    },
    {
      title: 'Mã YC liên quan',
      field: 'requestId',
      sortable: true,
      width: '120px',
      render: (val) => (
        <span
          style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/requests/${val}`);
          }}
        >
          {val}
        </span>
      ),
    },
    {
      title: 'Tiêu đề phương án',
      field: 'title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Vật tư: {row.materials || 'Theo tiêu chuẩn'} • Thời gian: {row.estimatedDuration}
          </div>
        </div>
      ),
    },
    {
      title: 'Hình thức',
      field: 'repairType',
      render: (val) => REPAIR_TYPE_LABELS[val] || val,
    },
    {
      title: 'Dự toán chi phí',
      field: 'estimatedCost',
      sortable: true,
      render: (val) => (
        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
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
      title: 'Trạng thái phê duyệt',
      field: 'approvalStatus',
      sortable: true,
      render: (val, row) => {
        let color = '#D97B0D';
        let bg = '#FFF1E5';
        let Icon = Clock;
        if (val === APPROVAL_STATUS.APPROVED) {
          color = '#229A58';
          bg = '#E9F8EF';
          Icon = CheckCircle2;
        } else if (val === APPROVAL_STATUS.REJECTED) {
          color = '#D64545';
          bg = '#FFF0F0';
          Icon = XCircle;
        }

        return (
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 600,
                color,
                backgroundColor: bg,
              }}
            >
              <Icon size={13} />
              {APPROVAL_LABELS[val] || val}
            </span>
            {val === APPROVAL_STATUS.REJECTED && row.rejectionReason && (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: 2 }}>
                Lý do: {row.rejectionReason}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={() => navigate(`/requests/${row.requestId}`)}
        >
          Xem yêu cầu
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Danh sách phương án sửa chữa"
        description="Tổng hợp các phương án sửa chữa và dự toán kinh phí do Quản trị CSVC lập"
      />

      <FilterBar onReset={() => { setSearch(''); setApprovalFilter(''); }} hasActiveFilters={Boolean(search || approvalFilter)}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã PA, mã YC, tiêu đề..."
          style={{ width: 280 }}
        />

        <select
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}
          className="form-control"
          style={{ width: 200 }}
        >
          <option value="">-- Tất cả phê duyệt --</option>
          <option value={APPROVAL_STATUS.PENDING}>Chờ phê duyệt</option>
          <option value={APPROVAL_STATUS.APPROVED}>Đã phê duyệt</option>
          <option value={APPROVAL_STATUS.REJECTED}>Bị từ chối</option>
        </select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredPlans}
        keyField="id"
        pageSize={10}
        onRowClick={(row) => navigate(`/requests/${row.requestId}`)}
        emptyTitle="Chưa có phương án sửa chữa nào"
        emptyDescription="Quản trị CSVC lập phương án sau khi cán bộ kỹ thuật hoàn tất khảo sát hiện trạng."
      />
    </div>
  );
}
