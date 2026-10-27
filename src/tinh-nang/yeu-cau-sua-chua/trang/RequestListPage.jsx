import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS, STATUS_LABELS, REPAIR_TYPE, REPAIR_TYPE_LABELS } from '../../../dung-chung/hang-so/statuses';
import { PRIORITY, PRIORITY_LABELS } from '../../../dung-chung/hang-so/priorities';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import { PlusCircle, Filter, Eye, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Select from '../../../dung-chung/thanh-phan/Select';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';

export default function RequestListPage() {
  const { requests, currentUser, users, updateRequest, addToast } = useApp();
  const navigate = useNavigate();

  // Search and filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Assign staff modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignNote, setAssignNote] = useState('');

  // Staff users for assignment
  const staffUsers = useMemo(() => {
    return users.filter((u) => u.role === ROLES.STAFF);
  }, [users]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (search) {
        const query = search.toLowerCase();
        const matchesCode = req.id.toLowerCase().includes(query);
        const matchesTitle = req.title.toLowerCase().includes(query);
        const matchesFacility = req.facilityName?.toLowerCase().includes(query);
        const matchesRequester = req.requesterName?.toLowerCase().includes(query);
        if (!matchesCode && !matchesTitle && !matchesFacility && !matchesRequester) return false;
      }
      if (statusFilter && req.status !== statusFilter) return false;
      if (priorityFilter && req.priority !== priorityFilter) return false;
      if (typeFilter && req.repairType !== typeFilter) return false;
      return true;
    });
  }, [requests, search, statusFilter, priorityFilter, typeFilter]);

  const hasActiveFilters = Boolean(search || statusFilter || priorityFilter || typeFilter);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setTypeFilter('');
  };

  // Quick Accept Action (for Facility Admin)
  const handleQuickAccept = (request, e) => {
    e.stopPropagation();
    updateRequest(request.id, {
      status: REQUEST_STATUS.ACCEPTED,
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Tiếp nhận yêu cầu',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: 'Đã tiếp nhận yêu cầu và chờ phân công cán bộ kỹ thuật',
        },
      ],
      history: [
        ...(request.history || []),
        {
          action: 'Tiếp nhận yêu cầu',
          performedBy: currentUser.name,
          timestamp: new Date().toISOString(),
          note: 'Yêu cầu hợp lệ, đã tiếp nhận',
        },
      ],
    });
    addToast(`Đã tiếp nhận yêu cầu ${request.id}`, 'success');
  };

  // Open Assign Modal
  const openAssignModal = (request, e) => {
    e.stopPropagation();
    setSelectedRequest(request);
    setSelectedStaffId(request.assignedStaffId || staffUsers[0]?.id || '');
    setAssignNote('');
    setAssignModalOpen(true);
  };

  // Save Assignment
  const handleSaveAssignment = () => {
    if (!selectedStaffId) {
      addToast('Vui lòng chọn cán bộ phụ trách', 'error');
      return;
    }
    const staff = staffUsers.find((s) => s.id === selectedStaffId);
    updateRequest(selectedRequest.id, {
      status: REQUEST_STATUS.SURVEYING,
      assignedStaffId: staff.id,
      assignedStaffName: staff.name,
      assignedAt: new Date().toISOString(),
      timeline: [
        ...(selectedRequest.timeline || []),
        {
          stage: 'Phân công cán bộ',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `Phân công cho cán bộ: ${staff.name}`,
        },
      ],
      history: [
        ...(selectedRequest.history || []),
        {
          action: 'Phân công cán bộ phụ trách',
          performedBy: currentUser.name,
          timestamp: new Date().toISOString(),
          note: `Giao cho ${staff.name} tiến hành khảo sát hiện trạng. ${assignNote ? `Ghi chú: ${assignNote}` : ''}`,
        },
      ],
    });
    addToast(`Đã phân công ${staff.name} phụ trách ${selectedRequest.id}`, 'success');
    setAssignModalOpen(false);
  };

  const columns = [
    {
      title: 'Mã YC',
      field: 'id',
      sortable: true,
      width: '110px',
      render: (val) => (
        <span style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{val}</span>
      ),
    },
    {
      title: 'Tiêu đề yêu cầu',
      field: 'title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {row.facilityName} • {row.location}
          </div>
        </div>
      ),
    },
    {
      title: 'Người yêu cầu',
      field: 'requesterName',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
            {row.department}
          </div>
        </div>
      ),
    },
    {
      title: 'Mức độ',
      field: 'priority',
      sortable: true,
      width: '120px',
      render: (val) => <PriorityBadge priority={val} />,
    },
    {
      title: 'Hình thức',
      field: 'repairType',
      render: (val) => (
        <span style={{ fontSize: '0.8125rem', color: val ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
          {val ? REPAIR_TYPE_LABELS[val] : 'Chưa xác định'}
        </span>
      ),
    },
    {
      title: 'Cán bộ phụ trách',
      field: 'assignedStaffName',
      render: (val) => (
        <span style={{ fontSize: '0.8125rem', color: val ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
          {val || 'Chưa phân công'}
        </span>
      ),
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
      width: '120px',
      render: (val) => formatDate(val),
    },
    {
      title: 'Thao tác',
      align: 'right',
      render: (_, row) => {
        const isFacilityAdmin = currentUser?.role === ROLES.FACILITY_ADMIN;
        const canAccept = isFacilityAdmin && row.status === REQUEST_STATUS.NEW;
        const canAssign = isFacilityAdmin && [REQUEST_STATUS.NEW, REQUEST_STATUS.ACCEPTED].includes(row.status);

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            {canAccept && (
              <Button
                variant="outline"
                size="sm"
                icon={CheckCircle}
                onClick={(e) => handleQuickAccept(row, e)}
              >
                Tiếp nhận
              </Button>
            )}
            {canAssign && (
              <Button
                variant="secondary"
                size="sm"
                icon={UserPlus}
                onClick={(e) => openAssignModal(row, e)}
              >
                Phân công
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
        title="Danh sách yêu cầu sửa chữa"
        description="Tổng hợp toàn bộ các yêu cầu sửa chữa cơ sở vật chất trong toàn trường"
        actions={
          currentUser?.role === ROLES.REQUESTER && (
            <Button
              variant="primary"
              icon={PlusCircle}
              onClick={() => navigate('/requests/create')}
            >
              Tạo yêu cầu mới
            </Button>
          )
        }
      />

      <FilterBar onReset={resetFilters} hasActiveFilters={hasActiveFilters}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã, tiêu đề, phòng, người gửi..."
          style={{ width: 280 }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-control"
          style={{ width: 180 }}
        >
          <option value="">-- Tất cả trạng thái --</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="form-control"
          style={{ width: 160 }}
        >
          <option value="">-- Mức độ ưu tiên --</option>
          {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-control"
          style={{ width: 170 }}
        >
          <option value="">-- Hình thức sửa --</option>
          {Object.entries(REPAIR_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredRequests}
        keyField="id"
        pageSize={10}
        onRowClick={(row) => navigate(`/requests/${row.id}`)}
        emptyTitle="Không tìm thấy yêu cầu nào"
        emptyDescription="Thử thay đổi từ khóa hoặc điều kiện bộ lọc để xem kết quả."
        emptyActionLabel={hasActiveFilters ? 'Xóa bộ lọc' : undefined}
        onEmptyAction={resetFilters}
      />

      {/* Assign Staff Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Phân công cán bộ kỹ thuật: ${selectedRequest?.id}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveAssignment}>
              Lưu phân công
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
            {selectedRequest?.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Vị trí: {selectedRequest?.facilityName} ({selectedRequest?.location})
          </div>
        </div>

        <Select
          label="Chọn cán bộ phụ trách khảo sát & sửa chữa"
          required
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          options={staffUsers.map((s) => ({
            value: s.id,
            label: `${s.name} - ${s.department} (${s.phone})`,
          }))}
        />

        <Textarea
          label="Ghi chú phân công / Chỉ đạo khảo sát"
          value={assignNote}
          onChange={(e) => setAssignNote(e.target.value)}
          placeholder="Nhập yêu cầu kiểm tra kỹ càng, ưu tiên hoàn thành trước ngày..."
          rows={3}
        />
      </Modal>
    </div>
  );
}

