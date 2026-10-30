import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS, REPAIR_TYPE, REPAIR_TYPE_LABELS } from '../../../dung-chung/hang-so/statuses';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import { Wrench, Eye, CheckCircle2, CheckSquare, AlertTriangle } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';

export default function RepairWorkPage() {
  const { requests, currentUser } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [taskCategory, setTaskCategory] = useState('ALL'); // ALL, SURVEY, INTERNAL, ACCEPTANCE

  // Staff's assigned requests
  const myAssignedRequests = useMemo(() => {
    return requests.filter((r) => {
      // If staff user is logged in, filter by assignedStaffId
      if (currentUser?.role === ROLES.STAFF && r.assignedStaffId !== currentUser.id) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!r.id.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q) && !r.facilityName?.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (taskCategory === 'SURVEY') {
        return [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.SURVEYING].includes(r.status);
      }
      if (taskCategory === 'INTERNAL') {
        return r.status === REQUEST_STATUS.INTERNAL_REPAIR;
      }
      if (taskCategory === 'ACCEPTANCE') {
        return [REQUEST_STATUS.WAITING_FOR_ACCEPTANCE, REQUEST_STATUS.NEEDS_REMEDIATION].includes(r.status);
      }
      return true;
    });
  }, [requests, currentUser, search, taskCategory]);

  const columns = [
    {
      title: 'Mã YC',
      field: 'id',
      sortable: true,
      width: '110px',
      render: (val) => <span style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{val}</span>,
    },
    {
      title: 'Nội dung sự cố',
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
      title: 'Hình thức',
      field: 'repairType',
      render: (val) => val ? REPAIR_TYPE_LABELS[val] : 'Chưa xác định',
    },
    {
      title: 'Trạng thái',
      field: 'status',
      sortable: true,
      render: (val) => <StatusBadge status={val} />,
    },
    {
      title: 'Ngày phân công',
      field: 'assignedAt',
      render: (val, row) => formatDate(val || row.createdAt),
    },
    {
      title: 'Thao tác nghiệp vụ',
      align: 'right',
      render: (_, row) => {
        const isSurveyStage = [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.SURVEYING].includes(row.status);
        const isInternalStage = row.status === REQUEST_STATUS.INTERNAL_REPAIR;
        const isAcceptanceStage = [REQUEST_STATUS.WAITING_FOR_ACCEPTANCE, REQUEST_STATUS.NEEDS_REMEDIATION].includes(row.status);

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            {isSurveyStage && (
              <Button
                variant="primary"
                size="sm"
                icon={Wrench}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/requests/${row.id}`);
                }}
              >
                Khảo sát
              </Button>
            )}

            {isInternalStage && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/requests/${row.id}`);
                }}
              >
                Cập nhật KQ
              </Button>
            )}

            {isAcceptanceStage && (
              <Button
                variant="warning"
                size="sm"
                icon={CheckSquare}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/requests/${row.id}`);
                }}
              >
                Nghiệm thu
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={() => navigate(`/requests/${row.id}`)}
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
        title="Công việc sửa chữa của cán bộ phụ trách"
        description="Không gian làm việc chuyên trách: khảo sát hiện trường, xử lý kỹ thuật và nghiệm thu"
      />

      {/* Filter Tabs by Task Phase */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { key: 'ALL', label: 'Tất cả công việc' },
          { key: 'SURVEY', label: 'Cần khảo sát' },
          { key: 'INTERNAL', label: 'Đang sửa chữa nội bộ' },
          { key: 'ACCEPTANCE', label: 'Cần nghiệm thu / Khắc phục' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTaskCategory(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${taskCategory === tab.key ? 'var(--color-blue)' : 'var(--color-border)'}`,
              backgroundColor: taskCategory === tab.key ? 'var(--color-blue-light)' : 'var(--color-white)',
              color: taskCategory === tab.key ? 'var(--color-blue)' : 'var(--color-text)',
              fontSize: '0.8125rem',
              fontWeight: taskCategory === tab.key ? 600 : 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <FilterBar onReset={() => setSearch('')} hasActiveFilters={Boolean(search)}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã hoặc tên công việc..."
          style={{ width: 300 }}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={myAssignedRequests}
        keyField="id"
        pageSize={10}
        onRowClick={(row) => navigate(`/requests/${row.id}`)}
        emptyTitle="Không có công việc nào trong danh mục này"
        emptyDescription="Tất cả các nhiệm vụ đã được xử lý hoặc chưa được phân công thêm."
      />
    </div>
  );
}
