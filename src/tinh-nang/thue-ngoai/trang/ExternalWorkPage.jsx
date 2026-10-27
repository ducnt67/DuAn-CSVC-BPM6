import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS, EXTERNAL_WORK_STATUS, EXTERNAL_WORK_STATUS_LABELS } from '../../../dung-chung/hang-so/statuses';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import { Truck, Eye, Edit, CheckCircle2, Clock, AlertTriangle, Paperclip } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Input from '../../../dung-chung/thanh-phan/Input';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';
import { formatCurrency } from '../../../dung-chung/tien-ich/formatCurrency';

export default function ExternalWorkPage() {
  const { externalWorks, updateExternalWork, requests, updateRequest, currentUser, addToast } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Update contractor & progress modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState(null);
  const [formData, setFormData] = useState({
    contractor: '',
    contractorContact: '',
    startDate: '',
    expectedEndDate: '',
    progress: 50,
    workNotes: '',
  });

  const filteredWorks = useMemo(() => {
    return externalWorks.filter((w) => {
      if (search) {
        const q = search.toLowerCase();
        if (!w.id.toLowerCase().includes(q) && !w.title.toLowerCase().includes(q) && !w.contractor?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter && w.status !== statusFilter) return false;
      return true;
    });
  }, [externalWorks, search, statusFilter]);

  const openUpdateModal = (work, e) => {
    if (e) e.stopPropagation();
    setSelectedWork(work);
    setFormData({
      contractor: work.contractor || 'Công ty TNHH Kỹ thuật Cơ điện Đà Nẵng',
      contractorContact: work.contractorContact || '0905123456 (Anh Tuấn)',
      startDate: work.startDate || new Date().toISOString().slice(0, 10),
      expectedEndDate: work.expectedEndDate || '',
      progress: work.progress || 50,
      workNotes: work.workNotes || '',
    });
    setModalOpen(true);
  };

  const handleSaveUpdate = () => {
    if (!formData.contractor.trim()) {
      addToast('Vui lòng nhập tên đơn vị thi công', 'error');
      return;
    }

    const newStatus = formData.progress >= 100 ? 'WORK_COMPLETED' : 'IN_PROGRESS';

    updateExternalWork(selectedWork.id, {
      ...formData,
      status: newStatus,
    });

    const relatedReq = requests.find((r) => r.id === selectedWork.requestId);
    if (relatedReq) {
      updateRequest(relatedReq.id, {
        status: REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS,
        contractor: formData.contractor,
        externalProgress: formData.progress,
        history: [
          ...(relatedReq.history || []),
          {
            action: 'Cập nhật tiến độ thuê ngoài',
            performedBy: currentUser?.name || 'BP Đầu tư & Mua sắm',
            timestamp: new Date().toISOString(),
            note: `Đơn vị thi công: ${formData.contractor} | Tiến độ: ${formData.progress}%`,
          },
        ],
      });
    }

    addToast(`Đã cập nhật công việc ${selectedWork.id}`, 'success');
    setModalOpen(false);
  };

  // Mark Completed by Contractor -> Send to Waiting Acceptance
  const handleMarkDoneForAcceptance = (work, e) => {
    if (e) e.stopPropagation();

    updateExternalWork(work.id, {
      status: 'WAITING_ACCEPTANCE',
      progress: 100,
      workCompletedAt: new Date().toISOString(),
    });

    const relatedReq = requests.find((r) => r.id === work.requestId);
    if (relatedReq) {
      updateRequest(relatedReq.id, {
        status: REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
        externalProgress: 100,
        timeline: [
          ...(relatedReq.timeline || []),
          {
            stage: 'Thi công xong - Chờ nghiệm thu',
            status: 'COMPLETED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.name || 'BP Đầu tư & Mua sắm',
            note: 'Đơn vị thi công đã thực hiện xong các hạng mục. Chuyển Cán bộ phụ trách nghiệm thu thực tế.',
          },
        ],
        history: [
          ...(relatedReq.history || []),
          {
            action: 'Hoàn thành thi công - Chuyển nghiệm thu',
            performedBy: currentUser?.name || 'BP Đầu tư & Mua sắm',
            timestamp: new Date().toISOString(),
            note: 'Đơn vị thi công báo hoàn thành. Đề nghị Cán bộ phụ trách kiểm tra hiện trường.',
          },
        ],
      });
    }

    addToast(`Công việc ${work.id} đã chuyển sang Chờ nghiệm thu!`, 'success');
  };

  const columns = [
    {
      title: 'Mã CV',
      field: 'id',
      sortable: true,
      width: '100px',
      render: (val) => <span style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{val}</span>,
    },
    {
      title: 'Mã YC',
      field: 'requestId',
      sortable: true,
      width: '110px',
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
      title: 'Nội dung hạng mục thuê ngoài',
      field: 'title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Nhà thầu: <strong>{row.contractor}</strong>
          </div>
        </div>
      ),
    },
    {
      title: 'Tiến độ',
      field: 'progress',
      sortable: true,
      render: (val) => (
        <div style={{ width: 120 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
            <span style={{ fontWeight: 600 }}>{val || 0}%</span>
          </div>
          <div style={{ height: 6, backgroundColor: 'var(--color-surface-muted)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${val || 0}%`,
                backgroundColor: val >= 100 ? 'var(--color-green)' : 'var(--color-blue)',
              }}
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      field: 'status',
      render: (val) => {
        let color = '#D97B0D';
        let bg = '#FFF1E5';
        if (val === 'COMPLETED') {
          color = '#229A58';
          bg = '#E9F8EF';
        } else if (val === 'NEEDS_REMEDIATION') {
          color = '#D64545';
          bg = '#FFF0F0';
        } else if (val === 'IN_PROGRESS') {
          color = '#1677C8';
          bg = '#EAF4FF';
        }

        return (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 20,
              fontSize: '0.75rem',
              fontWeight: 600,
              color,
              backgroundColor: bg,
            }}
          >
            {EXTERNAL_WORK_STATUS_LABELS[val] || val}
          </span>
        );
      },
    },
    {
      title: 'Thao tác nghiệp vụ',
      align: 'right',
      render: (_, row) => {
        const isProcurement = currentUser?.role === ROLES.PROCUREMENT;
        const canMarkDone = isProcurement && ['PENDING', 'IN_PROGRESS', 'WORK_COMPLETED'].includes(row.status);

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            {isProcurement && (
              <Button
                variant="outline"
                size="sm"
                icon={Edit}
                onClick={(e) => openUpdateModal(row, e)}
              >
                Cập nhật
              </Button>
            )}

            {canMarkDone && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle2}
                onClick={(e) => handleMarkDoneForAcceptance(row, e)}
              >
                Báo thi công xong
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              icon={Eye}
              onClick={() => navigate(`/requests/${row.requestId}`)}
            >
              Hồ sơ YC
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quản lý mua sắm và thi công xây dựng"
        description="Bộ phận Đầu tư, Mua sắm & Xây dựng quản lý hồ sơ nhà thầu, kế hoạch và giám sát tiến độ thi công thuê ngoài"
      />

      <FilterBar onReset={() => { setSearch(''); setStatusFilter(''); }} hasActiveFilters={Boolean(search || statusFilter)}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã CV, nhà thầu, tiêu đề..."
          style={{ width: 280 }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-control"
          style={{ width: 200 }}
        >
          <option value="">-- Tất cả trạng thái --</option>
          <option value="PENDING">Chờ tiếp nhận</option>
          <option value="IN_PROGRESS">Đang thực hiện</option>
          <option value="WAITING_ACCEPTANCE">Chờ nghiệm thu</option>
          <option value="NEEDS_REMEDIATION">Cần khắc phục</option>
          <option value="COMPLETED">Hoàn thành</option>
        </select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filteredWorks}
        keyField="id"
        pageSize={10}
        onRowClick={(row) => openUpdateModal(row)}
        emptyTitle="Chưa có công việc thuê ngoài nào"
        emptyDescription="Công việc sẽ xuất hiện tại đây khi phương án thuê ngoài được Ban Giám hiệu phê duyệt."
      />

      {/* Update Contractor & Progress Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Cập nhật thi công thuê ngoài: ${selectedWork?.id}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveUpdate}>
              Lưu cập nhật
            </Button>
          </>
        }
      >
        <Input
          label="Tên đơn vị thực hiện bên ngoài"
          required
          value={formData.contractor}
          onChange={(e) => setFormData((p) => ({ ...p, contractor: e.target.value }))}
          placeholder="VD: Công ty TNHH Kỹ thuật Cơ điện Đà Nẵng"
        />

        <Input
          label="Người đại diện / Số điện thoại"
          value={formData.contractorContact}
          onChange={(e) => setFormData((p) => ({ ...p, contractorContact: e.target.value }))}
          placeholder="0905123456 (Anh Tuấn)"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input
            label="Ngày bắt đầu thi công"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
          />
          <Input
            label="Ngày hoàn thành dự kiến"
            type="date"
            value={formData.expectedEndDate}
            onChange={(e) => setFormData((p) => ({ ...p, expectedEndDate: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Tiến độ thi công thực tế: {formData.progress}%</label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            style={{ width: '100%' }}
            value={formData.progress}
            onChange={(e) => setFormData((p) => ({ ...p, progress: Number(e.target.value) }))}
          />
        </div>

        <Textarea
          label="Ghi chú thi công / Báo cáo tuần"
          value={formData.workNotes}
          onChange={(e) => setFormData((p) => ({ ...p, workNotes: e.target.value }))}
          placeholder="Đang chạy thử nghiệm tải điện, thi công đúng theo hồ sơ thiết kế..."
          rows={3}
        />
      </Modal>
    </div>
  );
}

