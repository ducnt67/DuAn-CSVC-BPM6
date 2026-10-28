import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS } from '../../../dung-chung/hang-so/statuses';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import {
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  Eye,
  History,
  ShieldAlert,
  Clock,
  FastForward,
  Wrench,
  FileText,
} from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Input from '../../../dung-chung/thanh-phan/Input';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatDate, formatDateTime } from '../../../dung-chung/tien-ich/formatDate';

export default function AcceptancePage() {
  const { requests, updateRequest, externalWorks, updateExternalWork, currentUser, addToast, setNotifications } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, WAITING, WAITING_RESPONSE, OVERDUE, COMPLETED

  // Clock tick to refresh countdown every 30 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

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

  // Modal: Cập nhật sau 72h & Xử lý hợp đồng
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    actions: ['Phạt vi phạm hợp đồng'],
    violationClause: 'Điều 5.2 - Vi phạm thời hạn và chất lượng khắc phục sai sót',
    overdueNote: 'Qua kiểm tra thực tế sau thời hạn 72 giờ, nhà cung cấp vẫn chưa hoàn thành việc khắc phục các sai sót kỹ thuật theo yêu cầu trong biên bản nghiệm thu trước.',
    penaltyAmount: '',
    deductionAmount: '',
    paymentSuspensionUntil: '',
    contractExtensionUntil: '',
    terminationReason: '',
    contractNotes: 'Biên bản vi phạm đã được lập tại hiện trường có sự chứng kiến của cán bộ kỹ thuật.',
  });

  // Modal: Ghi nhận nhà cung cấp đã khắc phục (trong 72h)
  const [providerResponseModalOpen, setProviderResponseModalOpen] = useState(false);
  const [providerResponseForm, setProviderResponseForm] = useState({
    responseDate: new Date().toISOString().slice(0, 10),
    responseNote: 'Đơn vị thi công đã kiểm tra lại, thay thế linh kiện lỗi và hiệu chỉnh hệ thống. Đề nghị cán bộ nghiệm thu lại.',
  });

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Helper to compute 72-hour remediation deadline info
  const getDeadlineInfo = (req) => {
    if (
      ![
        REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE,
        REQUEST_STATUS.OVERDUE_REMEDIATION,
        REQUEST_STATUS.NEEDS_REMEDIATION,
      ].includes(req.status) &&
      req.acceptanceResult !== 'FAIL'
    ) {
      return null;
    }

    const requestedAt = req.remediationRequestedAt ? new Date(req.remediationRequestedAt).getTime() : null;
    const deadlineMs = req.remediationDeadline
      ? new Date(req.remediationDeadline).getTime()
      : requestedAt
      ? requestedAt + 72 * 3600 * 1000
      : null;

    if (!deadlineMs) return null;

    const now = Date.now();
    const diffMs = deadlineMs - now;
    const isOverdue = diffMs <= 0 || req.status === REQUEST_STATUS.OVERDUE_REMEDIATION;

    if (isOverdue) {
      const overdueHours = Math.max(1, Math.abs(Math.floor(diffMs / (3600 * 1000))));
      return {
        isOverdue: true,
        text: `Đã quá hạn ${overdueHours} giờ`,
        deadlineStr: formatDateTime(new Date(deadlineMs).toISOString()),
        diffMs,
      };
    }

    const hours = Math.floor(diffMs / (3600 * 1000));
    const minutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));

    return {
      isOverdue: false,
      text: `Còn ${hours} giờ ${minutes} phút`,
      deadlineStr: formatDateTime(new Date(deadlineMs).toISOString()),
      diffMs,
    };
  };

  // Filter requests that are relevant to external acceptance
  const acceptanceRequests = useMemo(() => {
    return requests.filter((r) => {
      // Must be external repair
      if (r.repairType !== 'EXTERNAL') return false;

      if (search) {
        const q = search.toLowerCase();
        if (
          !r.id.toLowerCase().includes(q) &&
          !r.title.toLowerCase().includes(q) &&
          !r.facilityName?.toLowerCase().includes(q) &&
          !r.contractor?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      if (filterType === 'WAITING') {
        return r.status === REQUEST_STATUS.WAITING_FOR_ACCEPTANCE;
      }
      if (filterType === 'WAITING_RESPONSE') {
        return (
          r.status === REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE ||
          r.status === REQUEST_STATUS.NEEDS_REMEDIATION
        );
      }
      if (filterType === 'OVERDUE') {
        return r.status === REQUEST_STATUS.OVERDUE_REMEDIATION;
      }
      if (filterType === 'COMPLETED') {
        return r.status === REQUEST_STATUS.COMPLETED;
      }

      // ALL tab
      return [
        REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
        REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE,
        REQUEST_STATUS.OVERDUE_REMEDIATION,
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
  // Rule: "Sau khi ghi nhận Không đạt thì chờ 72 giờ cho bên nhà cung cấp khắc phục"
  const handleSubmitAcceptance = () => {
    if (!acceptanceForm.checkItems.trim()) {
      addToast('Vui lòng nhập nội dung kiểm tra thực tế', 'error');
      return;
    }

    if (acceptanceForm.result === 'FAIL' && !acceptanceForm.remediationNotes.trim()) {
      addToast('Nghiệm thu Không đạt bắt buộc phải nhập nội dung cần khắc phục', 'error');
      return;
    }

    const now = new Date();
    const inspectionRecord = {
      id: `NT-${Date.now().toString().slice(-4)}`,
      inspectionDate: acceptanceForm.inspectionDate,
      inspectorName: currentUser?.name || 'Cán bộ kỹ thuật',
      checkItems: acceptanceForm.checkItems,
      result: acceptanceForm.result,
      notes: acceptanceForm.notes,
      remediationNotes: acceptanceForm.remediationNotes,
      timestamp: now.toISOString(),
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
            updatedAt: now.toISOString(),
            updatedBy: currentUser?.name || 'Cán bộ kỹ thuật',
            note: 'Nghiệm thu kỹ thuật đạt yêu cầu. Cán bộ có thể ký xác nhận hoàn thành sửa chữa.',
          },
        ],
        history: [
          ...(selectedRequest.history || []),
          {
            action: `Nghiệm thu lần ${newRecords.length}: ĐẠT`,
            performedBy: currentUser?.name || 'Cán bộ kỹ thuật',
            timestamp: now.toISOString(),
            note: `Kiểm tra đạt yêu cầu kỹ thuật. ${acceptanceForm.notes}`,
          },
        ],
      });
      addToast('Đã ghi nhận nghiệm thu ĐẠT! Bạn có thể nhấn Xác nhận hoàn thành.', 'success');
    } else {
      // KHÔNG ĐẠT: Chờ 72 giờ cho nhà cung cấp khắc phục
      const deadline72h = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

      updateRequest(selectedRequest.id, {
        status: REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE,
        acceptanceResult: 'FAIL',
        remediationNotes: acceptanceForm.remediationNotes,
        remediationRequestedAt: now.toISOString(),
        remediationDeadline: deadline72h,
        remediationHours: 72,
        remediationResponseReceived: false,
        remediationStatus: 'WAITING',
        acceptanceRecords: newRecords,
        timeline: [
          ...(selectedRequest.timeline || []),
          {
            stage: `Nghiệm thu lần ${newRecords.length}: KHÔNG ĐẠT`,
            status: 'FAILED',
            updatedAt: now.toISOString(),
            updatedBy: currentUser?.name || 'Cán bộ kỹ thuật',
            note: `Ghi nhận nghiệm thu Không đạt. Bắt đầu thời hạn 72 giờ chờ nhà cung cấp khắc phục (Hạn chót: ${formatDateTime(deadline72h)}). Nội dung: ${acceptanceForm.remediationNotes}`,
          },
        ],
        history: [
          ...(selectedRequest.history || []),
          {
            action: `Nghiệm thu lần ${newRecords.length}: KHÔNG ĐẠT`,
            performedBy: currentUser?.name || 'Cán bộ kỹ thuật',
            timestamp: now.toISOString(),
            note: `Không đạt. Thông báo nhà cung cấp khắc phục trong vòng 72 giờ: ${acceptanceForm.remediationNotes}`,
          },
        ],
      });

      const relatedWork = externalWorks.find((work) => work.requestId === selectedRequest.id);
      if (relatedWork) {
        updateExternalWork(relatedWork.id, {
          status: 'NEEDS_REMEDIATION',
          remediationContent: acceptanceForm.remediationNotes,
          remediationDeadline: deadline72h,
          remediationRequestedAt: now.toISOString(),
        });
      }

      setNotifications((previous) => [
        {
          id: `NTF-${Date.now()}`,
          title: 'Yêu cầu khắc phục sau nghiệm thu (Hạn 72 giờ)',
          message: `${selectedRequest.id}: Ghi nhận Không đạt. Nhà cung cấp có 72 giờ để khắc phục (hạn chót: ${formatDateTime(deadline72h)}).`,
          type: 'warning',
          targetRole: 'PROCUREMENT',
          createdAt: now.toISOString(),
          read: false,
        },
        ...previous,
      ]);

      // KHÔNG mở modal xử lý hợp đồng ngay! Đang trong thời hạn 72h chờ NCC khắc phục
      addToast(
        'Đã ghi nhận KHÔNG ĐẠT. Bắt đầu tính thời hạn 72 giờ cho nhà cung cấp khắc phục.',
        'warning'
      );
    }

    setAcceptanceModalOpen(false);
  };

  // Open modal: Cập nhật sau 72h & Xử lý theo hợp đồng
  // Rule: "sau 72 giờ mà chưa hoàn thành thì cán bộ sẽ cập nhập lại và xử lý theo hợp đồng"
  const openContractModal = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setContractForm({
      actions: req.contractHandling?.actions || ['Phạt vi phạm hợp đồng'],
      violationClause:
        req.contractHandling?.violationClause ||
        'Điều 5.2 - Vi phạm thời hạn và chất lượng khắc phục sai sót',
      overdueNote:
        req.contractHandling?.overdueNote ||
        'Qua kiểm tra thực tế sau thời hạn 72 giờ, nhà cung cấp vẫn chưa hoàn thành việc khắc phục các sai sót kỹ thuật theo yêu cầu trong biên bản nghiệm thu trước.',
      penaltyAmount: req.contractHandling?.penaltyAmount || '',
      deductionAmount: req.contractHandling?.deductionAmount || '',
      paymentSuspensionUntil: req.contractHandling?.paymentSuspensionUntil || '',
      contractExtensionUntil: req.contractHandling?.contractExtensionUntil || '',
      terminationReason: req.contractHandling?.terminationReason || '',
      contractNotes:
        req.contractHandling?.contractNotes ||
        'Biên bản vi phạm đã được lập tại hiện trường có sự chứng kiến của cán bộ kỹ thuật.',
    });
    setContractModalOpen(true);
  };

  const toggleContractAction = (action) => {
    setContractForm((previous) => ({
      ...previous,
      actions: previous.actions.includes(action)
        ? previous.actions.filter((item) => item !== action)
        : [...previous.actions, action],
    }));
  };

  // Submit: Cập nhật sau 72h & Lưu phương án xử lý hợp đồng
  const handleSaveContractHandling = () => {
    if (contractForm.actions.length === 0) {
      addToast('Vui lòng chọn ít nhất một biện pháp xử lý theo hợp đồng', 'error');
      return;
    }

    if (!contractForm.overdueNote.trim()) {
      addToast('Vui lòng nhập báo cáo kiểm tra tình trạng sau 72 giờ', 'error');
      return;
    }

    const now = new Date();
    const contractHandling = {
      ...contractForm,
      processedAt: now.toISOString(),
      processedBy: currentUser?.name || 'Cán bộ kỹ thuật',
      status: 'PROCESSED',
    };

    updateRequest(selectedRequest.id, {
      status: REQUEST_STATUS.OVERDUE_REMEDIATION,
      contractHandling,
      remediationStatus: 'OVERDUE_FAILED',
      timeline: [
        ...(selectedRequest.timeline || []),
        {
          stage: 'Sau 72 giờ: Cập nhật chưa hoàn thành & Xử lý hợp đồng',
          status: 'FAILED',
          updatedAt: now.toISOString(),
          updatedBy: currentUser?.name || 'Cán bộ kỹ thuật',
          note: `Quá thời hạn 72 giờ nhà cung cấp chưa hoàn thành khắc phục. Cán bộ cập nhật xử lý theo hợp đồng: ${contractForm.actions.join(
            '; '
          )}. ${contractForm.overdueNote}`,
        },
      ],
      history: [
        ...(selectedRequest.history || []),
        {
          action: 'Xử lý hợp đồng sau 72 giờ quá hạn',
          performedBy: currentUser?.name || 'Cán bộ kỹ thuật',
          timestamp: now.toISOString(),
          note: `Sau 72 giờ chưa hoàn thành khắc phục. Áp dụng chế tài: ${contractForm.actions.join(
            '; '
          )}. Điều khoản: ${contractForm.violationClause}`,
        },
      ],
    });

    const relatedWork = externalWorks.find((work) => work.requestId === selectedRequest.id);
    if (relatedWork) {
      updateExternalWork(relatedWork.id, {
        status: 'OVERDUE_REMEDIATION',
        notes: `Quá hạn 72 giờ chưa hoàn thành khắc phục. Áp dụng chế tài hợp đồng: ${contractForm.actions.join('; ')}`,
      });
    }

    setNotifications((previous) => [
      {
        id: `NTF-${Date.now()}`,
        title: 'Xử lý hợp đồng: Quá hạn 72h khắc phục',
        message: `${selectedRequest.id}: Cán bộ đã cập nhật tình trạng nhà cung cấp chưa hoàn thành sau 72 giờ và áp dụng chế tài theo hợp đồng (${contractForm.actions.join(', ')}).`,
        type: 'error',
        targetRole: 'DIRECTOR',
        createdAt: now.toISOString(),
        read: false,
      },
      ...previous,
    ]);

    setContractModalOpen(false);
    addToast('Đã cập nhật tình trạng sau 72 giờ và lưu phương án xử lý theo hợp đồng!', 'success');
  };

  // Open modal: Nhà cung cấp báo cáo đã khắc phục xong (trong 72h)
  const openProviderResponseModal = (req, e) => {
    if (e) e.stopPropagation();
    setSelectedRequest(req);
    setProviderResponseForm({
      responseDate: new Date().toISOString().slice(0, 10),
      responseNote: 'Đơn vị thi công đã kiểm tra lại, thay thế linh kiện lỗi và hiệu chỉnh hệ thống. Đề nghị cán bộ nghiệm thu lại.',
    });
    setProviderResponseModalOpen(true);
  };

  // Submit: Nhà cung cấp đã hoàn thành khắc phục -> chuyển sang chờ nghiệm thu lại
  const handleProviderResponse = () => {
    if (!providerResponseForm.responseNote.trim()) {
      addToast('Vui lòng nhập nội dung thông báo từ nhà cung cấp', 'error');
      return;
    }

    const now = new Date();
    updateRequest(selectedRequest.id, {
      status: REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
      remediationResponseReceived: true,
      remediationResponseDate: providerResponseForm.responseDate,
      remediationResponseNote: providerResponseForm.responseNote,
      remediationStatus: 'RESOLVED_WAITING_REINSPECTION',
      timeline: [
        ...(selectedRequest.timeline || []),
        {
          stage: 'Nhà cung cấp đã khắc phục - Chờ nghiệm thu lại',
          status: 'COMPLETED',
          updatedAt: now.toISOString(),
          updatedBy: currentUser?.name || 'Cán bộ phụ trách',
          note: `Nhà cung cấp đã báo cáo hoàn thành khắc phục: ${providerResponseForm.responseNote}. Đề nghị cán bộ nghiệm thu lại thực tế.`,
        },
      ],
      history: [
        ...(selectedRequest.history || []),
        {
          action: 'Ghi nhận hoàn thành khắc phục từ nhà cung cấp',
          performedBy: currentUser?.name || 'Cán bộ phụ trách',
          timestamp: now.toISOString(),
          note: `Ngày báo hoàn thành: ${formatDate(providerResponseForm.responseDate)}. ${providerResponseForm.responseNote}`,
        },
      ],
    });

    const relatedWork = externalWorks.find((work) => work.requestId === selectedRequest.id);
    if (relatedWork) {
      updateExternalWork(relatedWork.id, {
        status: 'WAITING_ACCEPTANCE',
        notes: 'Đã hoàn thành khắc phục, chuyển cán bộ nghiệm thu lại.',
      });
    }

    setProviderResponseModalOpen(false);
    addToast('Đã ghi nhận kết quả khắc phục của nhà cung cấp. Vui lòng tiến hành nghiệm thu lại.', 'success');
  };

  // Demo Fast-forward: Mô phỏng hết 72 giờ
  const handleSimulateOverdue72h = (req, e) => {
    if (e) e.stopPropagation();
    const pastDeadline = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    updateRequest(req.id, {
      remediationDeadline: pastDeadline,
    });
    addToast(`[Mô phỏng] Đã chỉnh thời hạn ${req.id} sang trạng thái: Đã hết 72 giờ!`, 'info');
  };

  // Confirm Completion by Staff (ONLY IF PASS)
  const handleConfirmCompletion = (req, e) => {
    if (e) e.stopPropagation();

    if (req.acceptanceResult !== 'PASS') {
      addToast('Không thể xác nhận hoàn thành khi chưa nghiệm thu ĐẠT yêu cầu', 'error');
      return;
    }

    const now = new Date();
    updateRequest(req.id, {
      status: REQUEST_STATUS.COMPLETED,
      completedAt: now.toISOString(),
      confirmedBy: currentUser.name,
      timeline: [
        ...(req.timeline || []),
        {
          stage: 'Xác nhận hoàn thành sửa chữa',
          status: 'COMPLETED',
          updatedAt: now.toISOString(),
          updatedBy: currentUser.name,
          note: `Cán bộ phụ trách (${currentUser.name}) đã ký xác nhận hoàn thành toàn bộ hạng mục sửa chữa sau nghiệm thu đạt`,
        },
      ],
      history: [
        ...(req.history || []),
        {
          action: 'Xác nhận hoàn thành sửa chữa thuê ngoài',
          performedBy: currentUser.name,
          timestamp: now.toISOString(),
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
      width: '100px',
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
      title: 'Trạng thái quy trình',
      field: 'status',
      width: '180px',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      title: 'Kết quả nghiệm thu & Thời hạn 72h',
      field: 'acceptanceResult',
      render: (val, row) => {
        const records = row.acceptanceRecords || [];
        const latest = records.length > 0 ? records[records.length - 1] : null;
        const deadlineInfo = getDeadlineInfo(row);

        if (!latest) {
          return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Chưa nghiệm thu</span>;
        }

        const isPass = latest.result === 'PASS';

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                ({records.length} lần kiểm tra)
              </span>
            </div>

            {/* 72h Remediation Countdown / Status */}
            {deadlineInfo && (
              <div
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: 4,
                  marginTop: 2,
                  display: 'inline-flex',
                  flexDirection: 'column',
                  gap: 2,
                  backgroundColor: deadlineInfo.isOverdue ? '#FFF0F0' : '#FFF8E6',
                  color: deadlineInfo.isOverdue ? 'var(--color-danger)' : '#B45309',
                  border: `1px solid ${deadlineInfo.isOverdue ? '#F5B8B8' : '#F5D4A8'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <Clock size={12} />
                  {deadlineInfo.isOverdue ? (
                    <span>⚠️ {deadlineInfo.text} (Chưa hoàn thành)</span>
                  ) : (
                    <span>⏳ Chờ khắc phục (72h): {deadlineInfo.text}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                  Hạn chót: {deadlineInfo.deadlineStr}
                </div>
              </div>
            )}

            {/* Contract Handling Badge if overdue & handled */}
            {row.status === REQUEST_STATUS.OVERDUE_REMEDIATION && row.contractHandling && (
              <div
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--color-danger)',
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                ⚖️ Đã xử lý HĐ: {row.contractHandling.actions?.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thao tác cán bộ',
      align: 'right',
      render: (_, row) => {
        const isStaff = currentUser?.role === ROLES.STAFF;
        const deadlineInfo = getDeadlineInfo(row);

        // Can inspect: Waiting for acceptance, or needs remediation re-inspection
        const canInspect =
          isStaff &&
          [
            REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
            REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE,
            REQUEST_STATUS.NEEDS_REMEDIATION,
          ].includes(row.status);

        // Waiting in 72h window
        const isWaiting72h =
          isStaff &&
          (row.status === REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE ||
            row.status === REQUEST_STATUS.NEEDS_REMEDIATION);

        // Can update after 72h & handle contract:
        // Visible when in 72h waiting status (especially highlighted when overdue), or already in overdue status
        const canHandleContract =
          isStaff &&
          (isWaiting72h || row.status === REQUEST_STATUS.OVERDUE_REMEDIATION);

        // Can confirm completion: PASS and in WAITING_FOR_ACCEPTANCE
        const canConfirmDone =
          isStaff &&
          row.status === REQUEST_STATUS.WAITING_FOR_ACCEPTANCE &&
          row.acceptanceResult === 'PASS';

        const hasHistory = row.acceptanceRecords?.length > 0;

        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
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


            {/* After 72h: Update & Handle contract */}
            {canHandleContract && (
              <Button
                variant={deadlineInfo?.isOverdue ? 'danger' : 'outline'}
                size="sm"
                icon={ShieldAlert}
                onClick={(e) => openContractModal(row, e)}
                title="Sau 72 giờ nhà cung cấp chưa hoàn thành, cán bộ cập nhật lại và xử lý theo hợp đồng"
                style={{
                  fontWeight: deadlineInfo?.isOverdue ? 700 : 500,
                  boxShadow: deadlineInfo?.isOverdue ? '0 0 0 2px rgba(220, 38, 38, 0.2)' : 'none',
                }}
              >
                {row.status === REQUEST_STATUS.OVERDUE_REMEDIATION
                  ? 'Chi tiết xử lý HĐ'
                  : deadlineInfo?.isOverdue
                  ? 'Quá 72h: Cập nhật & Xử lý HĐ'
                  : 'Cập nhật sau 72h & Xử lý HĐ'}
              </Button>
            )}

            {/* Demo Helper: Fast-forward 72 hours */}
            {isWaiting72h && !deadlineInfo?.isOverdue && (
              <button
                type="button"
                onClick={(e) => handleSimulateOverdue72h(row, e)}
                title="Kiểm thử nhanh: Mô phỏng đã trôi qua 72 giờ"
                style={{
                  padding: '3px 7px',
                  borderRadius: 4,
                  border: '1px dashed #D97B0D',
                  backgroundColor: '#FFF7E6',
                  color: '#B45309',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <FastForward size={11} /> Mô phỏng hết 72h
              </button>
            )}

            {/* Inspect Button */}
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

            {/* Confirm Completion Button */}
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
        title="Quản lý nghiệm thu và xử lý theo hợp đồng"
        description="Nghiệp vụ cốt lõi: Cán bộ phụ trách kiểm tra hiện trường, ghi nhận Đạt/Không đạt. Sau khi ghi nhận Không đạt, chờ 72 giờ cho nhà cung cấp khắc phục; sau 72 giờ chưa hoàn thành thì cán bộ cập nhật lại và xử lý theo hợp đồng."
      />

      {/* Workflow Rule Notification Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '12px 16px',
          marginBottom: 16,
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          color: '#1E40AF',
          fontSize: '0.8125rem',
        }}
      >
        <Clock size={18} style={{ flexShrink: 0, marginTop: 2, color: '#2563EB' }} />
        <div>
          <strong>Quy tắc quy trình:</strong> Sau khi cán bộ ghi nhận nghiệm thu <strong>Không đạt</strong>, hệ thống chuyển sang trạng thái <strong>Chờ 72 giờ</strong> cho nhà cung cấp khắc phục. Nếu sau 72 giờ bên nhà cung cấp <strong>chưa hoàn thành</strong>, cán bộ phụ trách sẽ cập nhật lại biên bản kiểm tra và tiến hành xử lý theo các điều khoản hợp đồng (phạt vi phạm, khấu trừ thanh toán, tạm dừng hoặc chấm dứt hợp đồng).
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { key: 'ALL', label: 'Tất cả công việc thuê ngoài' },
          { key: 'WAITING', label: 'Chờ nghiệm thu' },
          { key: 'WAITING_RESPONSE', label: 'Chờ NCC khắc phục (72h)' },
          { key: 'OVERDUE', label: 'Quá hạn 72h (Xử lý hợp đồng)' },
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab.key === 'WAITING_RESPONSE' && <Clock size={13} />}
            {tab.key === 'OVERDUE' && <AlertTriangle size={13} />}
            {tab.label}
          </button>
        ))}
      </div>

      <FilterBar onReset={() => setSearch('')} hasActiveFilters={Boolean(search)}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm mã YC, thiết bị, nhà thầu..."
          style={{ width: 320 }}
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

      {/* Modal 1: Biên bản kiểm tra nghiệm thu thực tế */}
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
              {acceptanceForm.result === 'PASS'
                ? 'Lưu kết quả Nghiệm thu ĐẠT'
                : 'Xác nhận KHÔNG ĐẠT (Chờ 72h khắc phục)'}
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
            {selectedRequest?.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Vị trí: {selectedRequest?.facilityName} ({selectedRequest?.location}) • Nhà thầu thi công: <strong>{selectedRequest?.contractor}</strong>
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
          <label className="form-label" style={{ fontWeight: 600 }}>Kết luận nghiệm thu hiện trường:</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <label
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
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
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 18px',
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
              KHÔNG ĐẠT (CHỜ 72H KHẮC PHỤC)
            </label>
          </div>
        </div>

        <Textarea
          label="Đánh giá chi tiết hiện trường"
          rows={2}
          value={acceptanceForm.notes}
          onChange={(e) => setAcceptanceForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Nhiệt độ đạt yêu cầu, phòng học đã sẵn sàng sử dụng..."
        />

        {acceptanceForm.result === 'FAIL' && (
          <div style={{ marginTop: 16 }}>
            {/* Rule Explanatory Banner */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FFF7ED',
                border: '1px solid #FFEDD5',
                color: '#C2410C',
                fontSize: '0.8125rem',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <Clock size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Quy định thời hạn 72 giờ:</strong> Sau khi ghi nhận <strong>Không đạt</strong>, nhà cung cấp sẽ có <strong>72 giờ (3 ngày)</strong> để khắc phục sai sót. Sau 72 giờ nếu chưa hoàn thành, cán bộ sẽ cập nhật lại kết quả và xử lý theo hợp đồng.
              </div>
            </div>

            <Textarea
              label="Nội dung cần đơn vị thi công / nhà cung cấp khắc phục (bắt buộc)"
              required
              rows={3}
              value={acceptanceForm.remediationNotes}
              onChange={(e) => setAcceptanceForm((p) => ({ ...p, remediationNotes: e.target.value }))}
              placeholder="Yêu cầu bọc lại cách nhiệt ống đồng, bổ sung nẹp bảo vệ dây cáp nguồn, đấu nối lại dây pha..."
            />

            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '0.8125rem',
                color: 'var(--color-text)',
              }}
            >
              <strong>Thời hạn khắc phục:</strong> 72 giờ tính từ thời điểm ghi nhận (Hạn chót dự kiến:{' '}
              <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                {formatDateTime(new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString())}
              </span>
              )
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 2: Cập nhật sau 72h & Xử lý theo hợp đồng */}
      <Modal
        isOpen={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        title={`Cập nhật kết quả sau 72 giờ & Xử lý hợp đồng: ${selectedRequest?.id}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setContractModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="danger" icon={ShieldAlert} onClick={handleSaveContractHandling}>
              Xác nhận cập nhật & Áp dụng xử lý HĐ
            </Button>
          </>
        }
      >
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 6,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4 }}>
            <AlertTriangle size={16} />
            Hết thời hạn 72 giờ khắc phục - Cán bộ cập nhật và xử lý vi phạm hợp đồng
          </div>
          <div>
            Theo quy định, sau 72 giờ mà nhà cung cấp chưa hoàn thành khắc phục sai sót kỹ thuật, cán bộ phụ trách tiến hành kiểm tra lại hiện trường, ghi nhận kết quả và áp dụng các chế tài theo điều khoản hợp đồng đã ký kết.
          </div>
        </div>

        {/* Request & Remediation Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            padding: 12,
            borderRadius: 6,
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            fontSize: '0.8125rem',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ color: 'var(--color-text-secondary)' }}>Hạng mục sửa chữa:</div>
            <div style={{ fontWeight: 600 }}>{selectedRequest?.title}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-secondary)' }}>Nhà thầu / Đơn vị thi công:</div>
            <div style={{ fontWeight: 600 }}>{selectedRequest?.contractor || 'Chưa chỉ định'}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-secondary)' }}>Thời điểm ghi nhận Không đạt:</div>
            <div>{formatDateTime(selectedRequest?.remediationRequestedAt)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--color-text-secondary)' }}>Hạn chót 72 giờ:</div>
            <div style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
              {formatDateTime(selectedRequest?.remediationDeadline)}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ color: 'var(--color-text-secondary)' }}>Yêu cầu khắc phục ban đầu:</div>
            <div style={{ fontStyle: 'italic', marginTop: 2 }}>{selectedRequest?.remediationNotes}</div>
          </div>
        </div>

        {/* Section 1: Cán bộ cập nhật tình trạng sau 72 giờ */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8 }}>
            <input type="checkbox" checked disabled />
            Xác nhận: Đã qua 72 giờ nhưng bên Nhà cung cấp CHƯA hoàn thành khắc phục
          </label>
          <Textarea
            label="Báo cáo kiểm tra thực tế sau 72 giờ của cán bộ phụ trách (bắt buộc)"
            required
            rows={3}
            value={contractForm.overdueNote}
            onChange={(e) => setContractForm((p) => ({ ...p, overdueNote: e.target.value }))}
            placeholder="Ghi nhận hiện trạng sau 72 giờ: Nhà thầu chưa cử nhân sự đến khắc phục hoặc việc sửa chữa chưa đạt yêu cầu kỹ thuật..."
          />
        </div>

        {/* Section 2: Biện pháp xử lý theo hợp đồng */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-text)' }}>
            Biện pháp xử lý theo các điều khoản hợp đồng:
          </h4>

          <Input
            label="Căn cứ điều khoản hợp đồng vi phạm"
            required
            value={contractForm.violationClause}
            onChange={(e) => setContractForm((p) => ({ ...p, violationClause: e.target.value }))}
            placeholder="Ví dụ: Điều 5.2 - Chất lượng thi công và thời hạn khắc phục sự cố"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 0' }}>
            {[
              'Phạt vi phạm hợp đồng',
              'Khấu trừ theo điều khoản hợp đồng',
              'Tạm dừng thanh toán hợp đồng',
              'Báo cáo chấm dứt hợp đồng',
              'Gia hạn hợp đồng có điều kiện',
            ].map((action) => (
              <label
                key={action}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: 10,
                  border: `1px solid ${contractForm.actions.includes(action) ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  borderRadius: 6,
                  backgroundColor: contractForm.actions.includes(action) ? '#FFF5F5' : 'transparent',
                  fontWeight: contractForm.actions.includes(action) ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={contractForm.actions.includes(action)}
                  onChange={() => toggleContractAction(action)}
                />
                {action}
              </label>
            ))}
          </div>


          {contractForm.actions.includes('Khấu trừ theo điều khoản hợp đồng') && (
            <Input
              label="Số tiền đề xuất khấu trừ vào giá trị quyết toán (VNĐ)"
              type="number"
              value={contractForm.deductionAmount}
              onChange={(e) => setContractForm((p) => ({ ...p, deductionAmount: e.target.value }))}
              placeholder="Ví dụ: 3500000"
            />
          )}

          {contractForm.actions.includes('Tạm dừng thanh toán hợp đồng') && (
            <Input
              label="Tạm dừng thanh toán các đợt tiếp theo đến ngày"
              type="date"
              value={contractForm.paymentSuspensionUntil}
              onChange={(e) => setContractForm((p) => ({ ...p, paymentSuspensionUntil: e.target.value }))}
            />
          )}

          {contractForm.actions.includes('Gia hạn hợp đồng có điều kiện') && (
            <Input
              label="Gia hạn hợp đồng có điều kiện đến ngày"
              type="date"
              value={contractForm.contractExtensionUntil}
              onChange={(e) => setContractForm((p) => ({ ...p, contractExtensionUntil: e.target.value }))}
            />
          )}

          {contractForm.actions.includes('Báo cáo chấm dứt hợp đồng') && (
            <Textarea
              label="Lý do đề xuất chấm dứt hợp đồng và tịch thu bảo lãnh hợp đồng"
              required
              rows={3}
              value={contractForm.terminationReason}
              onChange={(e) => setContractForm((p) => ({ ...p, terminationReason: e.target.value }))}
              placeholder="Nhà thầu không thực hiện nghĩa vụ bảo hành/khắc phục lỗi, vi phạm nghiêm trọng cam kết tiến độ..."
            />
          )}

          <Textarea
            label="Ghi chú & Căn cứ xử lý hợp đồng của cán bộ"
            rows={2}
            value={contractForm.contractNotes}
            onChange={(e) => setContractForm((p) => ({ ...p, contractNotes: e.target.value }))}
            placeholder="Căn cứ biên bản làm việc hiện trường, đính kèm hình ảnh sai sót..."
          />
        </div>
      </Modal>

      {/* Modal 3: Ghi nhận nhà cung cấp đã khắc phục (Hoàn thành trong 72h) */}
      <Modal
        isOpen={providerResponseModalOpen}
        onClose={() => setProviderResponseModalOpen(false)}
        title={`Ghi nhận hoàn thành khắc phục: ${selectedRequest?.id}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setProviderResponseModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" icon={Wrench} onClick={handleProviderResponse}>
              Xác nhận đã khắc phục (Chờ nghiệm thu lại)
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 12, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
          Hạn khắc phục 72 giờ: <strong>{formatDateTime(selectedRequest?.remediationDeadline)}</strong>
        </div>

        <Input
          label="Ngày nhà cung cấp thông báo hoàn thành khắc phục"
          type="date"
          required
          value={providerResponseForm.responseDate}
          onChange={(e) => setProviderResponseForm((p) => ({ ...p, responseDate: e.target.value }))}
        />

        <Textarea
          label="Nội dung chi tiết nhà cung cấp đã khắc phục (bắt buộc)"
          required
          rows={3}
          value={providerResponseForm.responseNote}
          onChange={(e) => setProviderResponseForm((p) => ({ ...p, responseNote: e.target.value }))}
          placeholder="Nhà cung cấp đã thay thế dây nguồn mới, hiệu chỉnh bo mạch và chạy thử nghiệm 30 phút..."
        />

        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 8 }}>
          * Sau khi ghi nhận, hồ sơ sẽ chuyển lại trạng thái <strong>Chờ nghiệm thu</strong> để cán bộ tiến hành kiểm tra nghiệm thu lại tại hiện trường.
        </div>
      </Modal>

      {/* Modal 4: Lịch sử nghiệm thu */}
      {selectedRequest && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Lịch sử nghiệm thu & xử lý hợp đồng: ${selectedRequest.id}`}
          size="lg"
          footer={
            <Button variant="secondary" onClick={() => setHistoryModalOpen(false)}>
              Đóng
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* If contract handling exists, show contract handling summary card */}
            {selectedRequest.contractHandling && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991B1B', fontWeight: 700, marginBottom: 8 }}>
                  <ShieldAlert size={16} />
                  Biên bản xử lý theo hợp đồng sau 72 giờ quá hạn
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#7F1D1D', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>
                    <strong>Căn cứ:</strong> {selectedRequest.contractHandling.violationClause}
                  </div>
                  <div>
                    <strong>Báo cáo cán bộ:</strong> {selectedRequest.contractHandling.overdueNote}
                  </div>
                  <div>
                    <strong>Biện pháp chế tài áp dụng:</strong>{' '}
                    <span style={{ fontWeight: 600 }}>{selectedRequest.contractHandling.actions?.join('; ')}</span>
                  </div>
                  {selectedRequest.contractHandling.penaltyAmount && (
                    <div>
                      <strong>Số tiền phạt vi phạm:</strong> {Number(selectedRequest.contractHandling.penaltyAmount).toLocaleString('vi-VN')} VNĐ
                    </div>
                  )}
                  {selectedRequest.contractHandling.deductionAmount && (
                    <div>
                      <strong>Số tiền đề xuất khấu trừ:</strong> {Number(selectedRequest.contractHandling.deductionAmount).toLocaleString('vi-VN')} VNĐ
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#991B1B', marginTop: 4 }}>
                    Xử lý bởi: <strong>{selectedRequest.contractHandling.processedBy}</strong> ngày {formatDateTime(selectedRequest.contractHandling.processedAt)}
                  </div>
                </div>
              </div>
            )}

            {/* List of inspection records */}
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
                  <strong>Ghi chú đánh giá:</strong> {item.notes}
                </div>

                {item.remediationNotes && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      backgroundColor: '#FFF0F0',
                      borderRadius: 4,
                      fontSize: '0.8125rem',
                      color: 'var(--color-danger)',
                    }}
                  >
                    <strong>Yêu cầu khắc phục (thời hạn 72h):</strong> {item.remediationNotes}
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
