import { useState, useMemo } from 'react';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import { FACILITY_TYPES } from '../../../du-lieu-demo/mockFacilities';
import { PlusCircle, Search, Building2, Edit, Eye, CheckCircle, AlertTriangle, History } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Input from '../../../dung-chung/thanh-phan/Input';
import Select from '../../../dung-chung/thanh-phan/Select';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';
import { useNavigate } from 'react-router-dom';

export default function FacilityListPage() {
  const { facilities, addFacility, updateFacility, currentUser, requests, addToast } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');

  // Add/Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Phòng học',
    building: 'Khu C',
    room: '',
    department: 'Phòng Quản trị CSVC',
    status: 'Hoạt động bình thường',
    description: '',
  });

  // History modal state
  const [historyFacility, setHistoryFacility] = useState(null);

  // Buildings list
  const buildings = useMemo(() => {
    return Array.from(new Set(facilities.map((f) => f.building))).filter(Boolean);
  }, [facilities]);

  // Filtered facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (search) {
        const q = search.toLowerCase();
        const matchCode = f.code?.toLowerCase().includes(q);
        const matchName = f.name?.toLowerCase().includes(q);
        const matchRoom = f.room?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchRoom) return false;
      }
      if (typeFilter && f.type !== typeFilter) return false;
      if (buildingFilter && f.building !== buildingFilter) return false;
      return true;
    });
  }, [facilities, search, typeFilter, buildingFilter]);

  const hasActiveFilters = Boolean(search || typeFilter || buildingFilter);

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setBuildingFilter('');
  };

  const handleOpenAddModal = () => {
    setEditingFacility(null);
    setFormData({
      code: `CSVC-${Date.now().toString().slice(-4)}`,
      name: '',
      type: FACILITY_TYPES[0] || 'Phòng học',
      building: 'Khu C',
      room: '',
      department: 'Phòng Quản trị CSVC',
      status: 'Hoạt động bình thường',
      description: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (facility, e) => {
    e.stopPropagation();
    setEditingFacility(facility);
    setFormData({
      code: facility.code,
      name: facility.name,
      type: facility.type,
      building: facility.building,
      room: facility.room,
      department: facility.department,
      status: facility.status,
      description: facility.description || '',
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      addToast('Vui lòng nhập mã và tên cơ sở vật chất', 'error');
      return;
    }

    if (editingFacility) {
      updateFacility(editingFacility.id, {
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      addToast(`Đã cập nhật cơ sở vật chất ${formData.code}`, 'success');
    } else {
      const newFacility = {
        id: formData.code,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      addFacility(newFacility);
      addToast(`Đã thêm mới cơ sở vật chất ${formData.code}`, 'success');
    }

    setModalOpen(false);
  };

  // View related requests
  const relatedRequests = useMemo(() => {
    if (!historyFacility) return [];
    return requests.filter(
      (r) => r.facilityId === historyFacility.id || r.facilityName === historyFacility.name
    );
  }, [requests, historyFacility]);

  const columns = [
    {
      title: 'Mã CSVC',
      field: 'code',
      sortable: true,
      width: '110px',
      render: (val) => <span style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{val}</span>,
    },
    {
      title: 'Tên cơ sở vật chất',
      field: 'name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {row.description || 'Không có ghi chú thêm'}
          </div>
        </div>
      ),
    },
    {
      title: 'Loại CSVC',
      field: 'type',
      sortable: true,
      render: (val) => (
        <span
          style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 4,
            backgroundColor: 'var(--color-surface-muted)',
            border: '1px solid var(--color-border)',
          }}
        >
          {val}
        </span>
      ),
    },
    {
      title: 'Tòa nhà',
      field: 'building',
      sortable: true,
      width: '100px',
    },
    {
      title: 'Phòng / Vị trí',
      field: 'room',
      sortable: true,
    },
    {
      title: 'Đơn vị quản lý',
      field: 'department',
    },
    {
      title: 'Tình trạng',
      field: 'status',
      render: (val) => {
        const isNormal = val?.includes('bình thường') || val?.includes('Tốt');
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.75rem',
              fontWeight: 500,
              color: isNormal ? 'var(--color-green)' : 'var(--color-warning)',
            }}
          >
            {isNormal ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {val}
          </span>
        );
      },
    },
    {
      title: 'Thao tác',
      align: 'right',
      render: (_, row) => {
        const canEdit = currentUser?.role === ROLES.FACILITY_ADMIN;
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <Button
              variant="ghost"
              size="sm"
              icon={History}
              title="Xem lịch sử sửa chữa"
              onClick={(e) => {
                e.stopPropagation();
                setHistoryFacility(row);
              }}
            >
              Lịch sử
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                icon={Edit}
                onClick={(e) => handleOpenEditModal(row, e)}
              >
                Sửa
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Danh mục cơ sở vật chất"
        description="Quản lý thông tin, tòa nhà, vị trí và hiện trạng cơ sở vật chất thuộc Trường Đại học Kinh tế"
        actions={
          currentUser?.role === ROLES.FACILITY_ADMIN && (
            <Button variant="primary" icon={PlusCircle} onClick={handleOpenAddModal}>
              Thêm cơ sở vật chất
            </Button>
          )
        }
      />

      <FilterBar onReset={resetFilters} hasActiveFilters={hasActiveFilters}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã, tên thiết bị, phòng..."
          style={{ width: 280 }}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-control"
          style={{ width: 180 }}
        >
          <option value="">-- Tất cả loại CSVC --</option>
          {FACILITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="form-control"
          style={{ width: 160 }}
        >
          <option value="">-- Tất cả tòa nhà --</option>
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredFacilities}
        keyField="id"
        pageSize={10}
        emptyTitle="Không tìm thấy cơ sở vật chất"
        emptyDescription="Thử kiểm tra lại từ khóa hoặc xóa điều kiện bộ lọc."
        emptyActionLabel={hasActiveFilters ? 'Xóa bộ lọc' : undefined}
        onEmptyAction={resetFilters}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFacility ? `Chỉnh sửa CSVC: ${editingFacility.code}` : 'Thêm cơ sở vật chất mới'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingFacility ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
            <Input
              label="Mã cơ sở vật chất"
              required
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              placeholder="VD: C101-AC"
            />
            <Input
              label="Tên cơ sở vật chất / Thiết bị"
              required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="VD: Máy điều hòa Daikin 2HP"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Select
              label="Loại cơ sở vật chất"
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
              options={FACILITY_TYPES}
            />
            <Select
              label="Tình trạng hoạt động"
              value={formData.status}
              onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
              options={[
                'Hoạt động bình thường',
                'Cần kiểm tra bảo dưỡng',
                'Đang có sự cố',
                'Hỏng hóc ngưng sử dụng',
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Input
              label="Tòa nhà"
              value={formData.building}
              onChange={(e) => setFormData((p) => ({ ...p, building: e.target.value }))}
              placeholder="Khu C"
            />
            <Input
              label="Phòng / Vị trí"
              value={formData.room}
              onChange={(e) => setFormData((p) => ({ ...p, room: e.target.value }))}
              placeholder="Phòng C101"
            />
            <Input
              label="Đơn vị quản lý"
              value={formData.department}
              onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
              placeholder="Phòng Quản trị CSVC"
            />
          </div>

          <Textarea
            label="Mô tả / Thông số kỹ thuật bổ sung"
            value={formData.description}
            onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            placeholder="Năm lắp đặt 2022, thời hạn bảo hành..."
            rows={3}
          />
        </form>
      </Modal>

      {/* History of Requests Modal */}
      <Modal
        isOpen={Boolean(historyFacility)}
        onClose={() => setHistoryFacility(null)}
        title={`Lịch sử yêu cầu sửa chữa: ${historyFacility?.name}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setHistoryFacility(null)}>
            Đóng
          </Button>
        }
      >
        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Vị trí: <strong>{historyFacility?.room} ({historyFacility?.building})</strong> • Đơn vị quản lý: {historyFacility?.department}
          </div>

          {relatedRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              Chưa có yêu cầu sửa chữa nào được ghi nhận cho cơ sở vật chất này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {relatedRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-blue)', fontSize: '0.875rem' }}>
                      {req.id}: {req.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      Người gửi: {req.requesterName} • Ngày gửi: {formatDate(req.createdAt)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHistoryFacility(null);
                      navigate(`/requests/${req.id}`);
                    }}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

