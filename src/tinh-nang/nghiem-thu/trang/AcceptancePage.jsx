import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS } from '../../../dung-chung/hang-so/statuses';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import { CheckSquare, CheckCircle2, AlertTriangle, Eye, History, ShieldAlert } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Input from '../../../dung-chung/thanh-phan/Input';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';

export default function AcceptancePage() {
  const { requests, updateRequest, currentUser, addToast } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, WAITING, REMEDIATION, COMPLETED

  // Acceptance Modal state
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [acceptanceForm, setAcceptanceForm] = useState({
    inspectionDate: new Date().toISOString().slice(0, 10),
    checkItems: 'Kiểm tra hoạt động thực tế của thiết bị, độ ồn và kết nối nguồn',
    result: 'PASS', // 'PASS' or 'FAIL'
    notes: 'Thiết bị hoạt động ổn định, đạt thông số kỹ thuật',
    remediationNotes: '',
  });

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Filter requests that are relevant to external acceptance
  const acceptanceRequests = useMemo(() => {
    return requests.filter((r) => {
      // Must be external repair
      if (r.repairType !== 'EXTERNAL') return false;

      if (search) {
        const q = search.toLowerCase();
        if (!r.id.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q) && !r.facilityName?.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (filterType === 'WAITING') {
        return r.status === REQUEST_STATUS.WAITING_FOR_ACCEPTANCE;
      }
      if (filterType === 'REMEDIATION') {
        return r.status === REQUEST_STATUS.NEEDS_REMEDIATION;
      }
      if (filterType === 'COMPLETED') {
        return r.status === REQUEST_STATUS.COMPLETED;
      }
      // ALL shows waiting, remediation, and recently completed external works
      return [
        REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
        REQUEST_STATUS.NEEDS_REMEDIATION,
        REQUEST_STATUS.COMPLETED,
        REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS,
      ].includes(r.status);
    });
  }, [requests, search, filterType]);

  const openAcceptanceModal = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setAcceptanceForm({
      inspectionDate: new Date().toISOString().slice(0, 10),
      checkItems: 'Kiểm tra độ lạnh, mạch điện và độ ồn thiết bị',
      result: 'PASS',
      notes: 'Thiết bị hoạt động bình thường, thông số đạt tiêu chuẩn',
      remediationNotes: '',
    });
    setAcceptanceModalOpen(true);
  };

  const openHistoryModal = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setHistoryModalOpen(true);
  };

  // Submit Acceptance Inspection
  const handleSubmitAcceptance = () => {
    if (!acceptanceForm.checkItems.trim()) {
      addToast('Vui lòng nhập nội dung kiểm tra thực tế', 'error');
      return;
    }

    if (acceptanceForm.result === 'FAIL' && !acceptanceForm.remediationNotes.trim()) {
      addToast('Nghiệm thu Không đạt bắt buộc phải nhập nội dung cần khắc phục', 'error');
      return;
    }

    const inspectionRecord = {
      id: `NT-${Date.now().toString().slice(-4)}`,
      inspectionDate: acceptanceForm.inspectionDate,
      inspectorName: currentUser?.name || 'Cán bộ kỹ thuật',
      checkItems: acceptanceForm.checkItems,
      result: acceptanceForm.result,
      notes: acceptanceForm.notes,
      remediationNotes: acceptanceForm.remediationNotes,
      timestamp: new Date().toISOString(),
    };

    const newRecords = [...(selectedRequest.acceptanceRecords || []), inspectionRecord];

    if (acceptanceForm.result === 'PASS') {
      updateRequest(selectedRequest.id, {
        status: REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
        acceptanceResult: 'PASS',
        acceptanceRecords: newRecords,
        timeline: [
          ...(selectedRequest.timeline || []),
          {
            stage: `Nghiệm thu lần ${newRecords.length}: ĐẠT`,
            status: 'COMPLETED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            note: 'Nghiệm thu kỹ thuật đạt yêu cầu. Có thể xác nhận hoàn thành.',
          },
        ],
        history: [
          ...(selectedRequest.history || []),
          {
            action: `Nghiệm thu lần ${newRecords.length}: ĐẠT`,
            performedBy: currentUser.name,
            timestamp: new Date().toISOString(),
            note: `Kiểm tra đạt yêu cầu kỹ thuật. ${acceptanceForm.notes}`,
          },
        ],
      });
      addToast('Đã ghi nhận nghiệm thu ĐẠT! Bạn có thể nhấn Xác nhận hoàn thành.', 'success');
    } else {
      updateRequest(selectedRequest.id, {
        status: REQUEST_STATUS.NEEDS_REMEDIATION,
        acceptanceResult: 'FAIL',
        remediationNotes: acceptanceForm.remediationNotes,
        acceptanceRecords: newRecords,
        timeline: [
          ...(selectedRequest.timeline || []),
          {
            stage: `Nghiệm thu lần ${newRecords.length}: KHÔNG ĐẠT`,
            status: 'FAILED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            note: `Cần khắc phục: ${acceptanceForm.remediationNotes}`,
          },
        ],
        history: [
          ...(selectedRequest.history || []),
          {
            action: `Nghiệm thu lần ${newRecords.length}: KHÔNG ĐẠT`,
            performedBy: currentUser.name,
            timestamp: new Date().toISOString(),
            note: `Không đạt. Yêu cầu khắc phục: ${acceptanceForm.remediationNotes}`,
          },
        ],
      });
      addToast('Đã ghi nhận kết quả nghiệm thu KHÔNG ĐẠT. Chuyển sang Cần khắc phục.', 'warning');
    }

    setAcceptanceModalOpen(false);
  };

  // Confirm Completion by Staff (ONLY IF PASS)
  const handleConfirmCompletion = (req, e) => {
    if (e) e.stopPropagation();

    if (req.acceptanceResult !== 'PASS') {
      addToast('Không thể xác nhận hoàn thành khi chưa nghiệm thu ĐẠT yêu cầu', 'error');
      return;
    }

    updateRequest(req.id, {
      status: REQUEST_STATUS.COMPLETED,
      completedAt: new Date().toISOString(),
      confirmedBy: currentUser.name,
      timeline: [
        ...(req.timeline || []),
        {
          stage: 'Xác nhận hoàn thành sửa chữa',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `Cán bộ phụ trách (${currentUser.name}) đã ký xác nhận hoàn thành toàn bộ hạng mục sửa chữa sau nghiệm thu đạt`,
        },
      ],
      history: [
        ...(req.history || []),
        {
          action: 'Xác nhận hoàn thành sửa chữa thuê ngoài',
          performedBy: currentUser.name,
          timestamp: new Date().toISOString(),
          note: 'Nghiệm thu đạt yêu cầu, đã đóng hồ sơ công việc hoàn thành.',
        },
      ],
    });

    addToast(`Yêu cầu ${req.id} đã được xác nhận HOÀN THÀNH!`, 'success');
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
      title: 'Hạng mục sửa chữa',
      field: 'title',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Vị trí: {row.facilityName} ({row.location}) • Đơn vị thi công: <strong>{row.contractor || 'Chưa chỉ định'}</strong>
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      field: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      title: 'Kết quả nghiệm thu',
      field: 'acceptanceResult',
      render: (val, row) => {
        const records = row.acceptanceRecords || [];
        if (records.length === 0) {
          return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Chưa nghiệm thu</span>;
        }

        const latest = records[records.length - 1];
        const isPass = latest.result === 'PASS';

        return (
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: isPass ? '#E9F8EF' : '#FFF0F0',
                color: isPass ? 'var(--color-green)' : 'var(--color-danger)',
                border: `1px solid ${isPass ? '#B0E0C8' : '#F5B8B8'}`,
              }}
            >
              {isPass ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {isPass ? 'ĐẠT' : 'KHÔNG ĐẠT'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginLeft: 6 }}>
              ({records.length} lần kiểm tra)
            </span>
          </div>
        );
      },
    },
    {
      title: 'Thao tác nghiệm thu',
      align: 'right',
      render: (_, row) => {
        const isStaff = currentUser?.role === ROLES.STAFF;
        const canInspect = isStaff && [REQUEST_STATUS.WAITING_FOR_ACCEPTANCE, REQUEST_STATUS.NEEDS_REMEDIATION].includes(row.status);
        const canConfirmDone = isStaff && row.status === REQUEST_STATUS.WAITING_FOR_ACCEPTANCE && row.acceptanceResult === 'PASS';
        const hasHistory = row.acceptanceRecords?.length > 0;

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            {hasHistory && (
              <Button
                variant="ghost"
                size="sm"
                icon={History}
                title="Lịch sử các lần nghiệm thu"
                onClick={(e) => openHistoryModal(row, e)}
              >
                Lịch sử ({row.acceptanceRecords.length})
              </Button>
            )}

            {canInspect && (
              <Button
                variant="warning"
                size="sm"
                icon={CheckSquare}
                onClick={(e) => openAcceptanceModal(row, e)}
              >
                Ghi nhận nghiệm thu
              </Button>
            )}

            {canConfirmDone && (
              <Button
                variant="success"
                size="sm"
                icon={CheckCircle2}
                onClick={(e) => handleConfirmCompletion(row, e)}
              >
                Xác nhận hoàn thành
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
        title="Quản lý nghiệm thu và xác nhận kết quả"
        description="Nghiệp vụ cốt lõi: Cán bộ phụ trách kiểm tra hiện trường thực tế, ghi nhận kết quả Đạt / Không đạt và xác nhận hoàn thành sửa chữa thuê ngoài"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { key: 'ALL', label: 'Tất cả công việc thuê ngoài' },
          { key: 'WAITING', label: 'Chờ nghiệm thu' },
          { key: 'REMEDIATION', label: 'Cần khắc phục (Không đạt)' },
          { key: 'COMPLETED', label: 'Đã hoàn thành' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterType(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${filterType === tab.key ? 'var(--color-blue)' : 'var(--color-border)'}`,
              backgroundColor: filterType === tab.key ? 'var(--color-blue-light)' : 'var(--color-white)',
              color: filterType === tab.key ? 'var(--color-blue)' : 'var(--color-text)',
              fontSize: '0.8125rem',
              fontWeight: filterType === tab.key ? 600 : 500,
              cursor: 'pointer',
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
          placeholder="Tìm mã YC, thiết bị, phòng..."
          style={{ width: 300 }}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={acceptanceRequests}
        keyField="id"
        pageSize={10}
        onRowClick={(row) => navigate(`/requests/${row.id}`)}
        emptyTitle="Không có công việc nào cần nghiệm thu"
        emptyDescription="Khi đơn vị thi công hoàn thành các hạng mục, hồ sơ sẽ chuyển tới đây để tổ chức nghiệm thu thực tế."
      />

      {/* Acceptance Form Modal */}
      <Modal
        isOpen={acceptanceModalOpen}
        onClose={() => setAcceptanceModalOpen(false)}
        title={`Biên bản kiểm tra nghiệm thu thực tế: ${selectedRequest?.id}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAcceptanceModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant={acceptanceForm.result === 'PASS' ? 'success' : 'danger'}
              onClick={handleSubmitAcceptance}
            >
              {acceptanceForm.result === 'PASS' ? 'Lưu kết quả Nghiệm thu ĐẠT' : 'Yêu cầu khắc phục (KHÔNG ĐẠT)'}
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
            {selectedRequest?.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Vị trí: {selectedRequest?.facilityName} ({selectedRequest?.location}) • Nhà thầu: {selectedRequest?.contractor}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input
            label="Ngày kiểm tra hiện trường"
            type="date"
            value={acceptanceForm.inspectionDate}
            onChange={(e) => setAcceptanceForm((p) => ({ ...p, inspectionDate: e.target.value }))}
          />
          <Input
            label="Cán bộ phụ trách nghiệm thu"
            disabled
            value={currentUser?.name || 'Cán bộ kỹ thuật'}
          />
        </div>

        <Textarea
          label="Nội dung các hạng mục đã kiểm tra thực tế"
          required
          rows={2}
          value={acceptanceForm.checkItems}
          onChange={(e) => setAcceptanceForm((p) => ({ ...p, checkItems: e.target.value }))}
          placeholder="Đo điện áp, nhiệt độ cửa gió, độ rung của giá treo máy nén..."
        />

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Kết luận nghiệm thu:</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${acceptanceForm.result === 'PASS' ? 'var(--color-green)' : 'var(--color-border)'}`,
                backgroundColor: acceptanceForm.result === 'PASS' ? 'var(--color-green-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: acceptanceForm.result === 'PASS' ? 'var(--color-green)' : 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="accResForm"
                checked={acceptanceForm.result === 'PASS'}
                onChange={() => setAcceptanceForm((p) => ({ ...p, result: 'PASS' }))}
              />
              ĐẠT YÊU CẦU KỸ THUẬT
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${acceptanceForm.result === 'FAIL' ? 'var(--color-danger)' : 'var(--color-border)'}`,
                backgroundColor: acceptanceForm.result === 'FAIL' ? 'var(--color-danger-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: acceptanceForm.result === 'FAIL' ? 'var(--color-danger)' : 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="accResForm"
                checked={acceptanceForm.result === 'FAIL'}
                onChange={() => setAcceptanceForm((p) => ({ ...p, result: 'FAIL' }))}
              />
              KHÔNG ĐẠT (CẦN KHẮC PHỤC)
            </label>
          </div>
        </div>

        <Textarea
          label="Đánh giá chi tiết"
          rows={2}
          value={acceptanceForm.notes}
          onChange={(e) => setAcceptanceForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Nhiệt độ đạt yêu cầu, phòng học đã sẵn sàng sử dụng..."
        />

        {acceptanceForm.result === 'FAIL' && (
          <div style={{ marginTop: 12 }}>
            <Textarea
              label="Nội dung cần đơn vị thi công khắc phục (bắt buộc)"
              required
              rows={3}
              value={acceptanceForm.remediationNotes}
              onChange={(e) => setAcceptanceForm((p) => ({ ...p, remediationNotes: e.target.value }))}
              placeholder="Yêu cầu bọc lại cách nhiệt ống đồng, bổ sung nẹp bảo vệ dây cáp nguồn..."
            />
          </div>
        )}
      </Modal>

      {/* History Modal */}
      {selectedRequest && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Lịch sử tất cả các lần nghiệm thu: ${selectedRequest.id}`}
          size="lg"
          footer={
            <Button variant="secondary" onClick={() => setHistoryModalOpen(false)}>
              Đóng
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selectedRequest.acceptanceRecords?.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${item.result === 'PASS' ? '#B0E0C8' : '#F5B8B8'}`,
                  backgroundColor: item.result === 'PASS' ? '#F6FCF8' : '#FFF8F8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: item.result === 'PASS' ? 'var(--color-green)' : 'var(--color-danger)',
                        color: '#FFF',
                      }}
                    >
                      LẦN {idx + 1}: {item.result === 'PASS' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      Ngày: {item.inspectionDate || formatDate(item.timestamp)}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Cán bộ nghiệm thu: <strong>{item.inspectorName}</strong>
                  </span>
                </div>

                <div style={{ fontSize: '0.8125rem', marginBottom: 4 }}>
                  <strong>Hạng mục kiểm tra:</strong> {item.checkItems}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  <strong>Ghi chú:</strong> {item.notes}
                </div>

                {item.remediationNotes && (
                  <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#FFF0F0', borderRadius: 4, fontSize: '0.8125rem', color: 'var(--color-danger)' }}>
                    <strong>Yêu cầu khắc phục:</strong> {item.remediationNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

