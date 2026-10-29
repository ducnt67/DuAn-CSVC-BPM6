import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS, REPAIR_TYPE, APPROVAL_STATUS } from '../../../dung-chung/hang-so/statuses';
import { ROLES, ROLE_LABELS } from '../../../dung-chung/hang-so/roles';
import {
  canAcceptRequest, canRequestInfo, canAssignStaff, canSurvey,
  canCreatePlan, canApprovePlan, canUpdateInternalResult,
  canConfirmInternalRepair, canSubmitAcceptance, canConfirmExternalCompletion,
  canUpdateExternalWork, canSupplementInfo
} from '../../../dung-chung/tien-ich/permissions';
import {
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, UserCheck,
  Wrench, FileText, Building2, Truck, ShieldCheck, CheckSquare,
  MessageSquare, XCircle, Calendar, DollarSign, Paperclip, ChevronRight, Check,
  Phone, CheckCircle
} from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import Button from '../../../dung-chung/thanh-phan/Button';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Input from '../../../dung-chung/thanh-phan/Input';
import Select from '../../../dung-chung/thanh-phan/Select';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';
import { formatCurrency } from '../../../dung-chung/tien-ich/formatCurrency';
import { generatePlanId, generateExternalWorkId } from '../../../dung-chung/tien-ich/generateId';
import './RequestDetailPage.css';

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    requests, updateRequest, currentUser, users,
    repairPlans, addRepairPlan, updateRepairPlan,
    externalWorks, addExternalWork, updateExternalWork,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('overview'); // overview, survey_plan, work, acceptance, history

  // Modals state
  const [modalType, setModalType] = useState(null); // 'accept', 'assign', 'request_info', 'supplement', 'survey', 'plan', 'approve', 'reject', 'internal_result', 'requester_confirm', 'external_update', 'external_complete', 'acceptance', 'confirm_completion'

  // Modal form states
  const [assignData, setAssignData] = useState({ staffId: '', note: '' });
  const [requestInfoNote, setRequestInfoNote] = useState('');
  const [supplementNote, setSupplementNote] = useState('');
  const [surveyData, setSurveyData] = useState({
    surveyDate: new Date().toISOString().slice(0, 16),
    findings: '',
    rootCause: '',
    damageLevel: 'Trung bình',
    recommendedAction: '',
  });
  const [planData, setPlanData] = useState({
    title: '',
    repairType: REPAIR_TYPE.INTERNAL,
    estimatedCost: 0,
    estimatedDuration: '2 ngày',
    materials: '',
    needsApproval: false,
    description: '',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [internalResultData, setInternalResultData] = useState({
    workDone: '',
    partsReplaced: '',
    testNotes: 'Đã chạy thử nghiệm tốt',
  });
  const [requesterConfirmData, setRequesterConfirmData] = useState({
    result: 'PASS',
    feedback: 'Đã kiểm tra thực tế, thiết bị hoạt động ổn định.',
  });
  const [externalUpdateData, setExternalUpdateData] = useState({
    contractor: '',
    contractorContact: '',
    progress: 50,
    workNotes: '',
  });
  const [acceptanceData, setAcceptanceData] = useState({
    inspectionDate: new Date().toISOString().slice(0, 10),
    checkItems: 'Kiểm tra độ lạnh, độ ồn và mạch điện',
    result: 'PASS', // 'PASS' or 'FAIL'
    notes: 'Thiết bị hoạt động đúng công suất thiết kế',
    remediationNotes: '',
  });

  // Current request
  const request = useMemo(() => {
    return requests.find((r) => r.id === id);
  }, [requests, id]);

  // Associated repair plan
  const plan = useMemo(() => {
    return repairPlans.find((p) => p.requestId === id);
  }, [repairPlans, id]);

  // Associated external work item
  const externalWork = useMemo(() => {
    return externalWorks.find((w) => w.requestId === id);
  }, [externalWorks, id]);

  // Staff users list
  const staffUsers = useMemo(() => {
    return users.filter((u) => u.role === ROLES.STAFF);
  }, [users]);

  // Is current viewer a requester
  const isRequester = currentUser?.role === ROLES.REQUESTER;

  // Assigned staff user details
  const assignedStaff = useMemo(() => {
    if (!request) return null;
    if (request.assignedStaffId) {
      return users.find((u) => u.id === request.assignedStaffId);
    }
    if (request.assignedStaffName) {
      return users.find((u) => u.name === request.assignedStaffName);
    }
    return null;
  }, [request, users]);

  // Reception receiver info
  const receptionInfo = useMemo(() => {
    if (!request) return { isReceived: false, receiverName: '', receivedAt: '' };
    const isReceived = request.status !== REQUEST_STATUS.NEW;
    const acceptTimeline = request.timeline?.find(
      (t) => t.stage?.toLowerCase().includes('tiếp nhận') || t.stage?.toLowerCase().includes('phân công')
    );
    const receiverName = acceptTimeline?.updatedBy || 'Bộ phận Quản trị CSVC';
    const receivedAt = acceptTimeline?.updatedAt || request.createdAt;
    return { isReceived, receiverName, receivedAt };
  }, [request]);

  if (!request) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 16px' }}>
        <h3>Không tìm thấy yêu cầu sửa chữa: {id}</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          Yêu cầu có thể đã bị xóa hoặc đường dẫn không hợp lệ.
        </p>
        <Button variant="primary" onClick={() => navigate('/requests')}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  // Permission helpers for action buttons
  const isReqAcceptable = canAcceptRequest(request, currentUser);
  const isReqAssignable = canAssignStaff(request, currentUser);
  const isReqInfoRequestable = canRequestInfo(request, currentUser);
  const isReqSupplementable = canSupplementInfo(request, currentUser);
  const isReqSurveyable = canSurvey(request, currentUser);
  const isReqPlanCreatable = canCreatePlan(request, currentUser);
  const isReqApprovable = canApprovePlan(request, currentUser);
  const isReqInternalResultUpdatable = canUpdateInternalResult(request, currentUser);
  const isReqInternalConfirmable = canConfirmInternalRepair(request, currentUser);
  const isReqExternalUpdatable = canUpdateExternalWork(request, currentUser);
  const isReqAcceptanceSubmittable = canSubmitAcceptance(request, currentUser);
  const isReqExternalCompletionConfirmable = canConfirmExternalCompletion(request, currentUser);

  // Helper to add audit history
  const createHistoryItem = (action, note) => ({
    action,
    performedBy: currentUser?.name || 'Hệ thống',
    role: currentUser?.role,
    timestamp: new Date().toISOString(),
    note,
  });

  /* ================= ACTION HANDLERS ================= */

  // 1. Quản trị CSVC: Tiếp nhận yêu cầu
  const handleAccept = () => {
    updateRequest(request.id, {
      status: REQUEST_STATUS.ACCEPTED,
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Tiếp nhận yêu cầu',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: 'Quản trị CSVC đã tiếp nhận và đang chỉ đạo phân công cán bộ kỹ thuật',
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem('Tiếp nhận yêu cầu', 'Hồ sơ sự cố hợp lệ, đã tiếp nhận vào hệ thống'),
      ],
    });
    addToast('Đã tiếp nhận yêu cầu sửa chữa', 'success');
    setModalType(null);
  };

  // 2. Quản trị CSVC: Phân công cán bộ
  const handleAssign = () => {
    if (!assignData.staffId) {
      addToast('Vui lòng chọn cán bộ phụ trách', 'error');
      return;
    }
    const staff = staffUsers.find((s) => s.id === assignData.staffId);
    updateRequest(request.id, {
      status: REQUEST_STATUS.SURVEYING,
      assignedStaffId: staff.id,
      assignedStaffName: staff.name,
      assignedAt: new Date().toISOString(),
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Phân công cán bộ',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `Đã phân công cán bộ phụ trách: ${staff.name}`,
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem(
          'Phân công cán bộ phụ trách',
          `Giao nhiệm vụ khảo sát hiện trạng cho ${staff.name}. Ghi chú: ${assignData.note || 'Khảo sát hiện trường'}`
        ),
      ],
    });
    addToast(`Đã phân công cho cán bộ ${staff.name}`, 'success');
    setModalType(null);
  };

  // 3. Quản trị CSVC: Yêu cầu bổ sung thông tin
  const handleRequestInfo = () => {
    if (!requestInfoNote.trim()) {
      addToast('Vui lòng nhập nội dung cần bổ sung', 'error');
      return;
    }
    updateRequest(request.id, {
      status: REQUEST_STATUS.NEEDS_INFORMATION,
      history: [
        ...(request.history || []),
        createHistoryItem('Yêu cầu bổ sung thông tin', requestInfoNote),
      ],
    });
    addToast('Đã gửi thông báo yêu cầu bổ sung thông tin tới người gửi', 'warning');
    setModalType(null);
  };

  // 4. Người yêu cầu: Bổ sung thông tin
  const handleSupplement = () => {
    if (!supplementNote.trim()) {
      addToast('Vui lòng nhập nội dung thông tin', 'error');
      return;
    }
    updateRequest(request.id, {
      status: REQUEST_STATUS.ACCEPTED,
      history: [
        ...(request.history || []),
        createHistoryItem('Bổ sung thông tin', supplementNote),
      ],
    });
    addToast('Đã cập nhật bổ sung thông tin thành công', 'success');
    setModalType(null);
  };

  // 5. Cán bộ: Ghi nhận khảo sát
  const handleSaveSurvey = () => {
    if (!surveyData.findings.trim() || !surveyData.rootCause.trim()) {
      addToast('Vui lòng nhập đầy đủ hiện trạng và nguyên nhân', 'error');
      return;
    }
    updateRequest(request.id, {
      status: REQUEST_STATUS.WAITING_FOR_PLAN,
      survey: {
        ...surveyData,
        surveyorName: currentUser.name,
        completedAt: new Date().toISOString(),
      },
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Khảo sát hiện trạng',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `Khảo sát: ${surveyData.findings}. Nguyên nhân: ${surveyData.rootCause}`,
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem(
          'Ghi nhận kết quả khảo sát',
          `Hiện trạng: ${surveyData.findings} | Nguyên nhân: ${surveyData.rootCause} | Mức độ: ${surveyData.damageLevel}`
        ),
      ],
    });
    addToast('Đã ghi nhận khảo sát hiện trạng thành công', 'success');
    setModalType(null);
  };

  // 6. Cán bộ: Lập phương án
  const handleSavePlan = () => {
    if (!planData.title.trim()) {
      addToast('Vui lòng nhập tiêu đề phương án', 'error');
      return;
    }
    const newPlanId = generatePlanId();
    const isNeedsApproval = planData.needsApproval || planData.repairType === REPAIR_TYPE.EXTERNAL;
    const nextStatus = isNeedsApproval
      ? REQUEST_STATUS.WAITING_FOR_APPROVAL
      : planData.repairType === REPAIR_TYPE.INTERNAL
      ? REQUEST_STATUS.INTERNAL_REPAIR
      : REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK;

    const newPlan = {
      id: newPlanId,
      requestId: request.id,
      title: planData.title,
      repairType: planData.repairType,
      estimatedCost: Number(planData.estimatedCost) || 0,
      estimatedDuration: planData.estimatedDuration,
      materials: planData.materials,
      description: planData.description,
      proposedBy: currentUser.name,
      proposedAt: new Date().toISOString(),
      approvalStatus: isNeedsApproval ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.APPROVED,
      requiresApproval: isNeedsApproval,
    };

    addRepairPlan(newPlan);

    updateRequest(request.id, {
      status: nextStatus,
      repairType: planData.repairType,
      planId: newPlanId,
      estimatedCost: Number(planData.estimatedCost) || 0,
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Lập phương án sửa chữa',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `Phương án: ${planData.title} (${planData.repairType === REPAIR_TYPE.INTERNAL ? 'Nội bộ' : 'Thuê ngoài'}). ${isNeedsApproval ? 'Chờ BGH phê duyệt.' : 'Đã duyệt tự động.'}`,
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem(
          'Lập phương án xử lý',
          `Hình thức: ${planData.repairType === REPAIR_TYPE.INTERNAL ? 'Sửa chữa nội bộ' : 'Thuê ngoài'} | Dự toán: ${formatCurrency(planData.estimatedCost)} | ${isNeedsApproval ? 'Gửi Ban Giám hiệu phê duyệt' : 'Tiến hành sửa chữa'}`
        ),
      ],
    });

    addToast(`Đã lập phương án ${newPlanId}`, 'success');
    setModalType(null);
  };

  // 7. Ban Giám hiệu: Phê duyệt phương án
  const handleApprove = () => {
    const nextStatus =
      request.repairType === REPAIR_TYPE.INTERNAL
        ? REQUEST_STATUS.INTERNAL_REPAIR
        : REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK;

    if (plan) {
      updateRepairPlan(plan.id, {
        approvalStatus: APPROVAL_STATUS.APPROVED,
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString(),
      });
    }

    // If external repair, also create the initial ExternalWork entry for Procurement
    if (request.repairType === REPAIR_TYPE.EXTERNAL && !externalWork) {
      const workId = generateExternalWorkId();
      addExternalWork({
        id: workId,
        requestId: request.id,
        planId: plan?.id,
        title: plan?.title || request.title,
        contractor: 'Đang lựa chọn đơn vị thi công',
        status: 'PENDING',
        progress: 0,
        estimatedCost: request.estimatedCost || 0,
        assignedToProcurement: true,
        createdAt: new Date().toISOString(),
      });
    }

    updateRequest(request.id, {
      status: nextStatus,
      approvalStatus: APPROVAL_STATUS.APPROVED,
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString(),
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Phê duyệt phương án',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: 'Ban Giám hiệu đã phê duyệt chủ trương và kinh phí thực hiện',
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem('Phê duyệt phương án', 'Ban Giám hiệu đồng ý phê duyệt phương án và dự toán'),
      ],
    });

    addToast('Phương án đã được Ban Giám hiệu phê duyệt', 'success');
    setModalType(null);
  };

  // 8. Ban Giám hiệu: Từ chối phương án
  const handleReject = () => {
    if (!rejectReason.trim()) {
      addToast('Bắt buộc phải nhập lý do từ chối', 'error');
      return;
    }

    if (plan) {
      updateRepairPlan(plan.id, {
        approvalStatus: APPROVAL_STATUS.REJECTED,
        rejectedBy: currentUser.name,
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectReason,
      });
    }

    updateRequest(request.id, {
      status: REQUEST_STATUS.WAITING_FOR_PLAN,
      approvalStatus: APPROVAL_STATUS.REJECTED,
      rejectionReason: rejectReason,
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Từ chối phương án',
          status: 'FAILED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `BGH từ chối: ${rejectReason}. Yêu cầu lập lại phương án.`,
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem('Từ chối phương án', `Lý do: ${rejectReason}`),
      ],
    });

    addToast('Đã từ chối phương án và gửi phản hồi đến cán bộ phụ trách', 'warning');
    setModalType(null);
  };

  // 9. Cán bộ: Cập nhật kết quả sửa chữa nội bộ
  const handleSaveInternalResult = () => {
    if (!internalResultData.workDone.trim()) {
      addToast('Vui lòng mô tả công việc đã thực hiện', 'error');
      return;
    }

    updateRequest(request.id, {
      status: REQUEST_STATUS.WAITING_FOR_CONFIRMATION,
      internalRepairResult: {
        ...internalResultData,
        completedAt: new Date().toISOString(),
        technician: currentUser.name,
      },
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Thực hiện sửa chữa nội bộ',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `Đã hoàn thành sửa chữa: ${internalResultData.workDone}. Chuyển người yêu cầu xác nhận.`,
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem(
          'Hoàn thành sửa chữa nội bộ',
          `Nội dung xử lý: ${internalResultData.workDone} | Vật tư: ${internalResultData.partsReplaced || 'Không'}`
        ),
      ],
    });

    addToast('Đã cập nhật kết quả sửa chữa. Yêu cầu chuyển sang Chờ xác nhận.', 'success');
    setModalType(null);
  };

  // 10. Người yêu cầu: Xác nhận kết quả nội bộ
  const handleRequesterConfirm = () => {
    if (requesterConfirmData.result === 'PASS') {
      updateRequest(request.id, {
        status: REQUEST_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        timeline: [
          ...(request.timeline || []),
          {
            stage: 'Xác nhận hoàn thành',
            status: 'COMPLETED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            note: `Người yêu cầu xác nhận đạt: ${requesterConfirmData.feedback}`,
          },
        ],
        history: [
          ...(request.history || []),
          createHistoryItem('Xác nhận hoàn thành', requesterConfirmData.feedback),
        ],
      });
      addToast('Đã xác nhận hoàn thành sửa chữa!', 'success');
    } else {
      if (!requesterConfirmData.feedback.trim()) {
        addToast('Vui lòng nhập lý do chưa đạt', 'error');
        return;
      }
      updateRequest(request.id, {
        status: REQUEST_STATUS.INTERNAL_REPAIR,
        timeline: [
          ...(request.timeline || []),
          {
            stage: 'Phản hồi chưa đạt',
            status: 'IN_PROGRESS',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            note: `Người yêu cầu phản hồi chưa đạt: ${requesterConfirmData.feedback}`,
          },
        ],
        history: [
          ...(request.history || []),
          createHistoryItem('Phản hồi kết quả chưa đạt', requesterConfirmData.feedback),
        ],
      });
      addToast('Đã gửi phản hồi yêu cầu kỹ thuật viên kiểm tra xử lý lại', 'warning');
    }
    setModalType(null);
  };

  // 11. BP Đầu tư, MS & XD: Tiếp nhận / Cập nhật tiến độ thuê ngoài
  const handleUpdateExternalWork = () => {
    if (!externalUpdateData.contractor.trim()) {
      addToast('Vui lòng nhập tên đơn vị thi công', 'error');
      return;
    }

    if (externalWork) {
      updateExternalWork(externalWork.id, {
        contractor: externalUpdateData.contractor,
        contractorContact: externalUpdateData.contractorContact,
        progress: externalUpdateData.progress,
        status: externalUpdateData.progress >= 100 ? 'WORK_COMPLETED' : 'IN_PROGRESS',
      });
    }

    updateRequest(request.id, {
      status: REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS,
      contractor: externalUpdateData.contractor,
      externalProgress: externalUpdateData.progress,
      history: [
        ...(request.history || []),
        createHistoryItem(
          'Cập nhật tiến độ thi công',
          `Đơn vị: ${externalUpdateData.contractor} | Tiến độ: ${externalUpdateData.progress}% | Ghi chú: ${externalUpdateData.workNotes || 'Đang thi công'}`
        ),
      ],
    });

    addToast('Đã cập nhật tiến độ công việc thuê ngoài', 'success');
    setModalType(null);
  };

  // 12. BP Đầu tư, MS & XD: Báo cáo hoàn thành thi công (chuyển sang CHỜ NGHIỆM THU)
  const handleMarkExternalWorkDone = () => {
    if (externalWork) {
      updateExternalWork(externalWork.id, {
        status: 'WAITING_ACCEPTANCE',
        progress: 100,
        workCompletedAt: new Date().toISOString(),
      });
    }

    updateRequest(request.id, {
      status: REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
      externalProgress: 100,
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Hoàn thành thi công thuê ngoài',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: 'Đơn vị thi công đã thực hiện xong. Chuyển Cán bộ phụ trách nghiệm thu thực tế.',
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem(
          'Đánh dấu hoàn thành thi công',
          'Đơn vị thi công đã hoàn thành các hạng mục. Đề nghị Cán bộ phụ trách tổ chức nghiệm thu thực tế.'
        ),
      ],
    });

    addToast('Đã chuyển công việc sang trạng thái Chờ nghiệm thu', 'success');
  };

  // 13. Cán bộ phụ trách: Nghiệm thu thực tế (Pass or Fail)
  const handleSubmitAcceptance = () => {
    if (!acceptanceData.checkItems.trim()) {
      addToast('Vui lòng nhập nội dung kiểm tra thực tế', 'error');
      return;
    }

    if (acceptanceData.result === 'FAIL' && !acceptanceData.remediationNotes.trim()) {
      addToast('Nghiệm thu KHÔNG ĐẠT bắt buộc phải nhập nội dung cần khắc phục', 'error');
      return;
    }

    const inspectionRecord = {
      id: `NT-${Date.now().toString().slice(-4)}`,
      inspectionDate: acceptanceData.inspectionDate,
      inspectorName: currentUser.name,
      checkItems: acceptanceData.checkItems,
      result: acceptanceData.result, // PASS or FAIL
      notes: acceptanceData.notes,
      remediationNotes: acceptanceData.remediationNotes,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [
      ...(request.history || []),
      createHistoryItem(
        `Nghiệm thu thực tế: ${acceptanceData.result === 'PASS' ? 'ĐẠT' : 'KHÔNG ĐẠT'}`,
        acceptanceData.result === 'PASS'
          ? `Nghiệm thu đạt yêu cầu kỹ thuật. ${acceptanceData.notes}`
          : `Không đạt. Cần khắc phục: ${acceptanceData.remediationNotes}`
      ),
    ];

    if (acceptanceData.result === 'PASS') {
      updateRequest(request.id, {
        status: REQUEST_STATUS.WAITING_FOR_ACCEPTANCE, // Stays in waiting acceptance until final completion confirmed, or ready to confirm
        acceptanceResult: 'PASS',
        acceptanceRecords: [...(request.acceptanceRecords || []), inspectionRecord],
        timeline: [
          ...(request.timeline || []),
          {
            stage: 'Nghiệm thu thực tế',
            status: 'COMPLETED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            note: 'Nghiệm thu ĐẠT. Cán bộ phụ trách có thể xác nhận hoàn thành sửa chữa.',
          },
        ],
        history: newHistory,
      });
      addToast('Đã ghi nhận nghiệm thu ĐẠT yêu cầu! Bạn có thể nhấn Xác nhận hoàn thành.', 'success');
    } else {
      updateRequest(request.id, {
        status: REQUEST_STATUS.NEEDS_REMEDIATION,
        acceptanceResult: 'FAIL',
        remediationNotes: acceptanceData.remediationNotes,
        acceptanceRecords: [...(request.acceptanceRecords || []), inspectionRecord],
        timeline: [
          ...(request.timeline || []),
          {
            stage: 'Nghiệm thu chưa đạt - Cần khắc phục',
            status: 'FAILED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.name,
            note: `Cần khắc phục: ${acceptanceData.remediationNotes}`,
          },
        ],
        history: newHistory,
      });
      addToast('Đã ghi nhận nghiệm thu KHÔNG ĐẠT. Yêu cầu chuyển sang Cần khắc phục.', 'warning');
    }

    setModalType(null);
  };

  // 14. Cán bộ phụ trách: Xác nhận hoàn thành sửa chữa thuê ngoài (CHỈ KHI NGHIỆM THU ĐẠT)
  const handleConfirmExternalCompletion = () => {
    if (request.acceptanceResult !== 'PASS') {
      addToast('Không thể xác nhận hoàn thành khi chưa nghiệm thu ĐẠT yêu cầu', 'error');
      return;
    }

    updateRequest(request.id, {
      status: REQUEST_STATUS.COMPLETED,
      completedAt: new Date().toISOString(),
      confirmedBy: currentUser.name,
      timeline: [
        ...(request.timeline || []),
        {
          stage: 'Xác nhận hoàn thành sửa chữa',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
          note: `Cán bộ phụ trách (${currentUser.name}) đã xác nhận hoàn thành toàn bộ công việc sau nghiệm thu đạt`,
        },
      ],
      history: [
        ...(request.history || []),
        createHistoryItem(
          'Xác nhận hoàn thành sửa chữa',
          'Đã nghiệm thu đạt và ký biên bản xác nhận hoàn thành công tác sửa chữa cơ sở vật chất.'
        ),
      ],
    });

    addToast('Yêu cầu sửa chữa đã được xác nhận HOÀN THÀNH!', 'success');
  };

  const WORKFLOW_STAGES = [
    { key: 'NEW', name: 'Khởi tạo', subtitle: 'Người yêu cầu' },
    { key: 'ACCEPTED', name: 'Tiếp nhận & Phân công', subtitle: 'Quản trị CSVC' },
    { key: 'SURVEYING', name: 'Khảo sát hiện trạng', subtitle: 'Cán bộ kỹ thuật' },
    { key: 'PLAN', name: 'Phương án & Duyệt', subtitle: 'Lập & BGH duyệt' },
    { key: 'EXECUTION', name: 'Sửa chữa / Thi công', subtitle: 'Nội bộ / Thuê ngoài' },
    { key: 'ACCEPTANCE', name: 'Nghiệm thu / Xác nhận', subtitle: 'Kiểm tra & Nghiệm thu' },
    { key: 'COMPLETED', name: 'Hoàn thành', subtitle: 'Kết thúc quy trình' },
  ];

  const currentStageIndex = useMemo(() => {
    if (!request) return 0;
    switch (request.status) {
      case REQUEST_STATUS.NEW:
        return 0;
      case REQUEST_STATUS.ACCEPTED:
      case REQUEST_STATUS.NEEDS_INFORMATION:
        return 1;
      case REQUEST_STATUS.SURVEYING:
        return 2;
      case REQUEST_STATUS.WAITING_FOR_PLAN:
      case REQUEST_STATUS.WAITING_FOR_APPROVAL:
        return 3;
      case REQUEST_STATUS.INTERNAL_REPAIR:
      case REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK:
      case REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS:
      case REQUEST_STATUS.NEEDS_REMEDIATION:
        return 4;
      case REQUEST_STATUS.WAITING_FOR_ACCEPTANCE:
      case REQUEST_STATUS.WAITING_FOR_CONFIRMATION:
        return 5;
      case REQUEST_STATUS.COMPLETED:
        return 6;
      default:
        return 0;
    }
  }, [request]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Top Navigation */}
      <div style={{ marginBottom: 16 }}>
        <Button
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          onClick={() => (isRequester ? navigate('/my-requests') : navigate(-1))}
        >
          {isRequester ? 'Quay lại Yêu cầu của tôi' : 'Quay lại danh sách'}
        </Button>
      </div>

      {/* Main Request Header Banner */}
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 24,
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--color-blue)',
                  backgroundColor: 'var(--color-blue-light)',
                  padding: '2px 10px',
                  borderRadius: 6,
                }}
              >
                {request.id}
              </span>
              <PriorityBadge priority={request.priority} />
              <StatusBadge status={request.status} />
              {!isRequester && request.repairType && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'var(--color-surface-muted)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {request.repairType === REPAIR_TYPE.INTERNAL ? 'Sửa chữa nội bộ' : 'Thuê ngoài'}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px 0' }}>
              {request.title}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              <span>Cơ sở vật chất: <strong>{request.facilityName}</strong></span>
              <span>•</span>
              <span>Vị trí: <strong>{request.location} ({request.building})</strong></span>
              <span>•</span>
              <span>Người gửi: <strong>{request.requesterName}</strong> ({request.department})</span>
              <span>•</span>
              <span>Ngày gửi: {formatDate(request.createdAt)}</span>
            </div>
          </div>

          {/* Actor-based Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Facility Admin actions - Sequential & Logical Workflow */}
            {isReqAcceptable && (
              <>
                <Button variant="primary" icon={CheckCircle2} onClick={handleAccept}>
                  Tiếp nhận yêu cầu
                </Button>
                {isReqInfoRequestable && (
                  <Button
                    variant="outline"
                    icon={MessageSquare}
                    onClick={() => {
                      setRequestInfoNote('');
                      setModalType('request_info');
                    }}
                    title="Yêu cầu người gửi làm rõ nếu thông tin sự cố chưa cụ thể"
                  >
                    Yêu cầu bổ sung
                  </Button>
                )}
              </>
            )}

            {isReqAssignable && (
              <>
                <Button
                  variant="primary"
                  icon={UserCheck}
                  onClick={() => {
                    setAssignData({ staffId: staffUsers[0]?.id || '', note: '' });
                    setModalType('assign');
                  }}
                >
                  Phân công cán bộ
                </Button>
                {isReqInfoRequestable && (
                  <Button
                    variant="ghost"
                    icon={MessageSquare}
                    onClick={() => {
                      setRequestInfoNote('');
                      setModalType('request_info');
                    }}
                  >
                    Yêu cầu bổ sung
                  </Button>
                )}
              </>
            )}

            {request.status === REQUEST_STATUS.NEEDS_INFORMATION && currentUser?.role === ROLES.FACILITY_ADMIN && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#D97706',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <Clock size={15} />
                Đang chờ người gửi bổ sung thông tin
              </span>
            )}

            {/* Requester actions */}
            {isReqSupplementable && (
              <Button
                variant="warning"
                icon={MessageSquare}
                onClick={() => {
                  setSupplementNote('');
                  setModalType('supplement');
                }}
              >
                Bổ sung thông tin
              </Button>
            )}

            {isReqInternalConfirmable && (
              <Button
                variant="primary"
                icon={CheckSquare}
                onClick={() => setModalType('requester_confirm')}
              >
                Xác nhận kết quả nội bộ
              </Button>
            )}

            {/* Staff actions */}
            {isReqSurveyable && (
              <Button
                variant="primary"
                icon={Wrench}
                onClick={() => setModalType('survey')}
              >
                Ghi nhận khảo sát
              </Button>
            )}

            {isReqPlanCreatable && (
              <Button
                variant="primary"
                icon={FileText}
                onClick={() => {
                  setPlanData({
                    title: `Phương án xử lý: ${request.title}`,
                    repairType: REPAIR_TYPE.INTERNAL,
                    estimatedCost: 500000,
                    estimatedDuration: '2 ngày',
                    materials: 'Vật tư thay thế thông dụng',
                    needsApproval: false,
                    description: '',
                  });
                  setModalType('plan');
                }}
              >
                Lập phương án xử lý
              </Button>
            )}

            {isReqInternalResultUpdatable && (
              <Button
                variant="primary"
                icon={CheckCircle2}
                onClick={() => setModalType('internal_result')}
              >
                Cập nhật kết quả sửa chữa nội bộ
              </Button>
            )}

            {isReqAcceptanceSubmittable && (
              <Button
                variant="warning"
                icon={CheckSquare}
                onClick={() => setModalType('acceptance')}
              >
                Nghiệm thu thực tế
              </Button>
            )}

            {isReqExternalCompletionConfirmable && (
              <Button
                variant="success"
                icon={CheckCircle2}
                onClick={handleConfirmExternalCompletion}
              >
                Xác nhận hoàn thành thuê ngoài
              </Button>
            )}

            {/* Director actions */}
            {isReqApprovable && (
              <>
                <Button variant="danger" icon={XCircle} onClick={() => setModalType('reject')}>
                  Từ chối
                </Button>
                <Button variant="success" icon={ShieldCheck} onClick={handleApprove}>
                  Phê duyệt phương án
                </Button>
              </>
            )}

            {/* Procurement actions */}
            {isReqExternalUpdatable && (
              <Button
                variant="outline"
                icon={Truck}
                onClick={() => {
                  setExternalUpdateData({
                    contractor: request.contractor || externalWork?.contractor || 'Công ty TNHH Kỹ thuật Cơ điện Đà Nẵng',
                    contractorContact: '0905123456 (Anh Tuấn)',
                    progress: request.externalProgress || 50,
                    workNotes: '',
                  });
                  setModalType('external_update');
                }}
              >
                Cập nhật tiến độ thi công
              </Button>
            )}

            {isReqExternalUpdatable && request.status === REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS && (
              <Button
                variant="primary"
                icon={CheckCircle2}
                onClick={handleMarkExternalWorkDone}
              >
                Báo hoàn thành thi công
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Workflow Timeline Bar (BPM Stepper) */}
      <div className="bpm-workflow-card">
        <div className="bpm-workflow-header">
          <div className="bpm-workflow-title-group">
            <span className="bpm-workflow-badge">Quy trình BPM</span>
            <h3 className="bpm-workflow-title">Tiến trình quy trình xử lý sự cố</h3>
            <span className="bpm-workflow-subtitle">• 7 bước chuẩn hóa theo quy trình vận hành</span>
          </div>

          <div className="bpm-workflow-current-pill">
            <span className="bpm-stage-pulsing-dot" />
            <span>
              {request.status === REQUEST_STATUS.COMPLETED ? (
                <>Trạng thái: <strong>Đã hoàn thành toàn bộ quy trình</strong></>
              ) : (
                <>Hiện tại: <strong>Bước {currentStageIndex + 1}/7 - {WORKFLOW_STAGES[currentStageIndex]?.name}</strong></>
              )}
            </span>
          </div>
        </div>

        <div className="bpm-stepper-track-wrapper">
          <div className="bpm-stepper-track">
            {WORKFLOW_STAGES.map((stage, idx) => {
              const isDone = idx < currentStageIndex || request.status === REQUEST_STATUS.COMPLETED;
              const isCurr = idx === currentStageIndex && request.status !== REQUEST_STATUS.COMPLETED;
              const isRemediation = idx === 4 && request.status === REQUEST_STATUS.NEEDS_REMEDIATION;

              // Left line connected if this step is reached (idx <= currentStageIndex)
              const isLeftConnected = idx > 0 && idx <= currentStageIndex;

              // Right line connected if next step is reached (idx < currentStageIndex)
              const isRightConnected = idx < WORKFLOW_STAGES.length - 1 && idx < currentStageIndex;

              return (
                <div key={stage.key} className="bpm-step-column">
                  {/* Top Node Row with Left Line, Circle, Right Line */}
                  <div className="bpm-node-row">
                    {/* Left Line */}
                    <div
                      className={`bpm-node-line line-left ${idx === 0 ? 'is-hidden' : ''} ${isLeftConnected ? 'is-completed' : ''}`}
                    />

                    {/* Step Circle */}
                    <div
                      className={`bpm-node-circle ${isRemediation ? 'remediation' : isDone ? 'done' : isCurr ? 'current' : 'pending'}`}
                      title={`Bước ${idx + 1}: ${stage.name}`}
                    >
                      {isRemediation ? (
                        <AlertTriangle size={17} />
                      ) : isDone ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    {/* Right Line */}
                    <div
                      className={`bpm-node-line line-right ${idx === WORKFLOW_STAGES.length - 1 ? 'is-hidden' : ''} ${isRightConnected ? 'is-completed' : ''}`}
                    />
                  </div>

                  {/* Label below circle */}
                  <div className="bpm-step-label-content">
                    <div className={`bpm-step-index-label ${isCurr ? 'current' : isDone ? 'done' : ''}`}>
                      Bước {idx + 1}
                    </div>
                    <div className={`bpm-step-main-title ${isCurr ? 'current' : isDone ? 'done' : ''}`}>
                      {stage.name}
                    </div>
                    <div className="bpm-step-sub-role">
                      {stage.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA: Dedicated Requester View VS Full Staff Tabs */}
      {isRequester ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Card 1: Mô tả sự cố & Vị trí */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Mô tả sự cố & Vị trí</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 16 }}>
              {request.description}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Cơ sở vật chất:</span>
                <div style={{ fontWeight: 600 }}>{request.facilityName}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Mã thiết bị / phòng:</span>
                <div style={{ fontWeight: 600 }}>{request.facilityId}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Tòa nhà:</span>
                <div style={{ fontWeight: 600 }}>{request.building}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Phòng / Vị trí:</span>
                <div style={{ fontWeight: 600 }}>{request.location}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Thời điểm phát hiện:</span>
                <div style={{ fontWeight: 600 }}>{formatDate(request.discoveredAt)}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Mức độ ưu tiên:</span>
                <div><PriorityBadge priority={request.priority} /></div>
              </div>
            </div>

            {request.attachments?.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Tài liệu / Ảnh đính kèm:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {request.attachments.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        backgroundColor: 'var(--color-surface-muted)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <Paperclip size={13} color="#1677C8" />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Thông tin tiếp nhận & Nhân sự phụ trách */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Thông tin tiếp nhận & Nhân sự phụ trách</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.875rem' }}>
              
              {/* 1. Tình trạng tiếp nhận */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: receptionInfo.isReceived ? '#E9F8EF' : '#FFF8E6',
                    color: receptionInfo.isReceived ? '#229A58' : '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {receptionInfo.isReceived ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Tình trạng tiếp nhận yêu cầu
                  </div>
                  <div style={{ fontWeight: 700, color: receptionInfo.isReceived ? '#229A58' : '#D97706', marginTop: 2 }}>
                    {receptionInfo.isReceived ? 'Đã tiếp nhận yêu cầu' : 'Đang chờ tiếp nhận'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {receptionInfo.isReceived
                      ? `Bộ phận: Phòng Quản trị Cơ sở vật chất (${receptionInfo.receiverName})`
                      : 'Phòng Quản trị CSVC sẽ kiểm tra hồ sơ và tiếp nhận trong thời gian sớm nhất'}
                  </div>
                </div>
              </div>

              {/* 2. Cán bộ kỹ thuật phụ trách */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: request.assignedStaffName ? '#FFF1E5' : '#F1F5F9',
                    color: request.assignedStaffName ? '#F58220' : '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Wrench size={19} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Cán bộ kỹ thuật phụ trách
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text)', marginTop: 2 }}>
                    {request.assignedStaffName || 'Đang chờ phân công cán bộ kỹ thuật'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {request.assignedStaffName
                      ? (assignedStaff?.department || 'Tổ Kỹ thuật - Phòng Quản trị Cơ sở vật chất')
                      : 'Hệ thống sẽ cập nhật thông tin và số điện thoại khi Quản trị CSVC chỉ định cán bộ'}
                  </div>

                  {request.assignedStaffName && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 8,
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #DCFCE7',
                        fontSize: '0.8rem',
                        color: '#15803D',
                        fontWeight: 600,
                      }}
                    >
                      <Phone size={14} />
                      <span>SĐT liên hệ: <strong>{assignedStaff?.phone || '0903456789'}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Người gửi yêu cầu */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: '#EAF4FF',
                    color: '#1677C8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <UserCheck size={19} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Người gửi yêu cầu
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: 2 }}>
                    {request.requesterName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                    {request.department} • SĐT: {request.contactPhone || '—'}
                  </div>
                </div>
              </div>

              {/* 4. Action Banner for Requester when feedback is needed */}
              {request.status === REQUEST_STATUS.WAITING_FOR_CONFIRMATION && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#E9F8EF',
                    border: '1px solid #B0E0C8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1B7C46', fontWeight: 700, fontSize: '0.875rem' }}>
                    <CheckCircle size={18} />
                    <span>Kỹ thuật viên đã xử lý xong sự cố!</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#1B7C46', lineHeight: 1.5 }}>
                    Vui lòng kiểm tra thực tế thiết bị tại phòng học. Nhấn xác nhận để hoàn tất quy trình hoặc phản hồi nếu thiết bị chưa đạt.
                  </div>
                  <Button variant="primary" icon={CheckSquare} onClick={() => setModalType('requester_confirm')}>
                    Xác nhận kết quả sửa chữa
                  </Button>
                </div>
              )}

              {request.status === REQUEST_STATUS.NEEDS_INFORMATION && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#FFF8E6',
                    border: '1px solid #FAD175',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#975A16', fontWeight: 700, fontSize: '0.875rem' }}>
                    <AlertTriangle size={18} />
                    <span>Yêu cầu bổ sung thêm thông tin</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#975A16', lineHeight: 1.5 }}>
                    Quản trị CSVC cần bạn cung cấp thêm thông tin vị trí hoặc hình ảnh hiện trạng để xử lý.
                  </div>
                  <Button
                    variant="warning"
                    icon={MessageSquare}
                    onClick={() => {
                      setSupplementNote('');
                      setModalType('supplement');
                    }}
                  >
                    Bổ sung thông tin ngay
                  </Button>
                </div>
              )}

              {request.status === REQUEST_STATUS.COMPLETED && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #B9E6FE',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#026AA2',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={18} color="#026AA2" />
                  <span>Yêu cầu sửa chữa này đã hoàn thành toàn bộ quy trình. Cảm ơn bạn!</span>
                </div>
              )}

            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs Navigation for Staff / Admin / Director */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              borderBottom: '1px solid var(--color-border)',
              marginBottom: 20,
            }}
          >
            {[
              { key: 'overview', label: 'Thông tin sự cố' },
              { key: 'survey_plan', label: 'Khảo sát & Phương án' },
              { key: 'work', label: 'Thực hiện & Thi công' },
              { key: 'acceptance', label: `Nghiệm thu (${request.acceptanceRecords?.length || 0})` },
              { key: 'history', label: `Lịch sử xử lý (${request.history?.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  color: activeTab === tab.key ? 'var(--color-blue)' : 'var(--color-text-secondary)',
                  borderBottom: `2px solid ${activeTab === tab.key ? 'var(--color-blue)' : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Card: Chi tiết sự cố */}
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>Mô tả sự cố & Vị trí</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 16 }}>
                  {request.description}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Cơ sở vật chất:</span>
                    <div style={{ fontWeight: 600 }}>{request.facilityName}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Mã thiết bị / phòng:</span>
                    <div style={{ fontWeight: 600 }}>{request.facilityId}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Tòa nhà:</span>
                    <div style={{ fontWeight: 600 }}>{request.building}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Phòng / Vị trí:</span>
                    <div style={{ fontWeight: 600 }}>{request.location}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Thời điểm phát hiện:</span>
                    <div style={{ fontWeight: 600 }}>{formatDate(request.discoveredAt)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Mức độ ưu tiên:</span>
                    <div><PriorityBadge priority={request.priority} /></div>
                  </div>
                </div>

                {request.attachments?.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border-light)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      Tài liệu / Ảnh đính kèm:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {request.attachments.map((file, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            backgroundColor: 'var(--color-surface-muted)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <Paperclip size={13} color="#1677C8" />
                          <span>{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card: Phụ trách & Đơn vị */}
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>Thông tin nhân sự xử lý</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#EAF4FF', color: '#1677C8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserCheck size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Người gửi yêu cầu</div>
                      <div style={{ fontWeight: 600 }}>{request.requesterName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{request.department} • SĐT: {request.contactPhone || '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#FFF1E5', color: '#F58220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wrench size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Cán bộ kỹ thuật phụ trách</div>
                      <div style={{ fontWeight: 600 }}>{request.assignedStaffName || 'Chưa phân công'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        {request.assignedStaffName ? 'Tổ Kỹ thuật - CSVC' : 'Đang chờ Quản trị CSVC phân công'}
                      </div>
                    </div>
                  </div>

                  {request.repairType === REPAIR_TYPE.EXTERNAL && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#E9F8EF', color: '#229A58', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Truck size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Đơn vị thi công ngoài</div>
                        <div style={{ fontWeight: 600 }}>{request.contractor || externalWork?.contractor || 'Chưa chỉ định'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>BP Đầu tư & Mua sắm quản lý hồ sơ</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 2: SURVEY & PLAN */}
          {activeTab === 'survey_plan' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Card: Kết quả khảo sát */}
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>Kết quả khảo sát hiện trạng</h3>
                {request.survey ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Cán bộ khảo sát:</span>
                      <div style={{ fontWeight: 600 }}>{request.survey.surveyorName} ({formatDate(request.survey.completedAt)})</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Hiện trạng ghi nhận:</span>
                      <div style={{ fontWeight: 500, marginTop: 2 }}>{request.survey.findings}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Nguyên nhân sự cố:</span>
                      <div style={{ fontWeight: 500, marginTop: 2 }}>{request.survey.rootCause}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Mức độ hư hỏng:</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{request.survey.damageLevel}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    Chưa có dữ liệu khảo sát. Cán bộ kỹ thuật phụ trách sẽ tiến hành kiểm tra hiện trường.
                  </div>
                )}
              </div>

              {/* Card: Phương án & Phê duyệt */}
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}>Phương án xử lý đề xuất</h3>
                {plan || request.planId ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Mã & Tiêu đề phương án:</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{plan?.id || request.planId}: {plan?.title}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Hình thức:</span>
                        <div style={{ fontWeight: 600 }}>
                          {request.repairType === REPAIR_TYPE.INTERNAL ? 'Sửa chữa nội bộ' : 'Thuê ngoài'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Dự toán chi phí:</span>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          {formatCurrency(plan?.estimatedCost || request.estimatedCost || 0)}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Thời gian dự kiến:</span>
                      <div>{plan?.estimatedDuration || '2 ngày làm việc'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Vật tư / Thiết bị thay thế:</span>
                      <div>{plan?.materials || 'Vật tư theo tiêu chuẩn'}</div>
                    </div>
                    <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-border-light)' }}>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Trạng thái phê duyệt BGH:</span>
                      <div style={{ marginTop: 4 }}>
                        {plan?.approvalStatus === APPROVAL_STATUS.APPROVED || request.approvalStatus === APPROVAL_STATUS.APPROVED ? (
                          <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>Đã được Ban Giám hiệu phê duyệt</span>
                        ) : plan?.approvalStatus === APPROVAL_STATUS.REJECTED || request.approvalStatus === APPROVAL_STATUS.REJECTED ? (
                          <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                            Bị từ chối: {plan?.rejectionReason || request.rejectionReason}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Đang chờ Ban Giám hiệu xem xét</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    Chưa lập phương án xử lý.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: EXECUTION / WORK */}
          {activeTab === 'work' && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>
                {request.repairType === REPAIR_TYPE.INTERNAL
                  ? 'Tiến độ sửa chữa nội bộ'
                  : 'Hồ sơ thi công thuê ngoài (BP Đầu tư, Mua sắm & Xây dựng)'}
              </h3>

              {request.repairType === REPAIR_TYPE.INTERNAL ? (
                request.internalRepairResult ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.875rem' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Kỹ thuật viên thực hiện:</span>
                      <div style={{ fontWeight: 600 }}>{request.internalRepairResult.technician} ({formatDate(request.internalRepairResult.completedAt)})</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Công việc đã xử lý:</span>
                      <div style={{ marginTop: 2 }}>{request.internalRepairResult.workDone}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Linh kiện / Vật tư đã thay:</span>
                      <div style={{ marginTop: 2 }}>{request.internalRepairResult.partsReplaced || 'Không thay linh kiện'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>Kiểm tra thử nghiệm:</span>
                      <div style={{ marginTop: 2, color: 'var(--color-green)', fontWeight: 500 }}>{request.internalRepairResult.testNotes}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    Cán bộ phụ trách đang tiến hành xử lý kỹ thuật tại hiện trường.
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, fontSize: '0.8125rem' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Mã công việc:</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-blue)' }}>{externalWork?.id || 'TN-0001'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Đơn vị thi công:</span>
                      <div style={{ fontWeight: 600 }}>{request.contractor || externalWork?.contractor || 'Chưa chỉ định'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Tiến độ hoàn thành:</span>
                      <div style={{ fontWeight: 700, color: 'var(--color-blue)', fontSize: '1rem' }}>
                        {request.externalProgress ?? externalWork?.progress ?? 0}%
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                      <span>Tiến độ thực tế</span>
                      <span>{request.externalProgress ?? externalWork?.progress ?? 0}%</span>
                    </div>
                    <div style={{ height: 8, backgroundColor: 'var(--color-surface-muted)', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${request.externalProgress ?? externalWork?.progress ?? 0}%`,
                          backgroundColor: 'var(--color-blue)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {request.status === REQUEST_STATUS.NEEDS_REMEDIATION && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-danger-light)',
                        border: '1px solid #F5B8B8',
                        color: 'var(--color-danger)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <strong>Yêu cầu khắc phục sau nghiệm thu:</strong>
                      <div style={{ marginTop: 4 }}>{request.remediationNotes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 4: ACCEPTANCE (CRITICAL FOR WORKFLOW RULE) */}
          {activeTab === 'acceptance' && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={cardTitleStyle}>Lịch sử nghiệm thu thực tế</h3>
                {isReqAcceptanceSubmittable && (
                  <Button variant="warning" size="sm" icon={CheckSquare} onClick={() => setModalType('acceptance')}>
                    Thực hiện nghiệm thu mới
                  </Button>
                )}
              </div>

              {request.acceptanceRecords && request.acceptanceRecords.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {request.acceptanceRecords.map((item, idx) => (
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
                            {item.result === 'PASS' ? 'NGHIỆM THU ĐẠT' : 'KHÔNG ĐẠT'}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            Lần kiểm tra ngày: {item.inspectionDate || formatDate(item.timestamp)}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          Người kiểm tra: <strong>{item.inspectorName}</strong>
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text)', marginBottom: 4 }}>
                        <strong>Nội dung kiểm tra:</strong> {item.checkItems}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        <strong>Đánh giá thực tế:</strong> {item.notes}
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
                          <strong>Nội dung bắt buộc khắc phục:</strong> {item.remediationNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                  Chưa có bản ghi nghiệm thu nào cho yêu cầu này.
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 5: AUDIT HISTORY */}
          {activeTab === 'history' && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>Nhật ký lịch sử xử lý</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {request.history?.map((h, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: 12,
                      paddingBottom: 12,
                      borderBottom: idx < request.history.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-blue)', marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{h.action}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{formatDate(h.timestamp)}</span>
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        Thực hiện bởi: <strong>{h.performedBy}</strong>
                      </div>
                      {h.note && (
                        <div style={{ marginTop: 4, color: 'var(--color-text)', fontStyle: 'italic' }}>
                          "{h.note}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= MODALS FOR WORKFLOW ACTIONS ================= */}

      {/* 1. Modal Phân công cán bộ (Facility Admin) */}
      <Modal
        isOpen={modalType === 'assign'}
        onClose={() => setModalType(null)}
        title="Phân công cán bộ kỹ thuật phụ trách"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button variant="primary" onClick={handleAssign}>Xác nhận phân công</Button>
          </>
        }
      >
        <Select
          label="Chọn cán bộ kỹ thuật"
          required
          value={assignData.staffId}
          onChange={(e) => setAssignData((p) => ({ ...p, staffId: e.target.value }))}
          options={staffUsers.map((s) => ({
            value: s.id,
            label: `${s.name} - ${s.department} (${s.phone})`,
          }))}
        />
        <Textarea
          label="Chỉ đạo công việc / Hạn hoàn thành"
          value={assignData.note}
          onChange={(e) => setAssignData((p) => ({ ...p, note: e.target.value }))}
          placeholder="Khảo sát gấp trong ngày, kiểm tra an toàn điện..."
        />
      </Modal>

      {/* 2. Modal Yêu cầu bổ sung thông tin (Facility Admin) */}
      <Modal
        isOpen={modalType === 'request_info'}
        onClose={() => setModalType(null)}
        title="Yêu cầu người gửi bổ sung thông tin"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button variant="warning" onClick={handleRequestInfo}>Gửi yêu cầu bổ sung</Button>
          </>
        }
      >
        <Textarea
          label="Nội dung cần người gửi làm rõ"
          required
          value={requestInfoNote}
          onChange={(e) => setRequestInfoNote(e.target.value)}
          placeholder="Vui lòng cung cấp mã model máy điều hòa hoặc phòng học cụ thể..."
          rows={4}
        />
      </Modal>

      {/* 3. Modal Bổ sung thông tin (Requester) */}
      <Modal
        isOpen={modalType === 'supplement'}
        onClose={() => setModalType(null)}
        title="Bổ sung thông tin cho sự cố"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button variant="primary" onClick={handleSupplement}>Cập nhật thông tin</Button>
          </>
        }
      >
        <Textarea
          label="Nội dung bổ sung"
          required
          value={supplementNote}
          onChange={(e) => setSupplementNote(e.target.value)}
          placeholder="Mã máy là Panasonic Inverter CU-YZ9WKH, phát hiện lúc 8h sáng..."
          rows={4}
        />
      </Modal>

      {/* 4. Modal Ghi nhận khảo sát (Staff) */}
      <Modal
        isOpen={modalType === 'survey'}
        onClose={() => setModalType(null)}
        title="Ghi nhận kết quả khảo sát hiện trạng"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button variant="primary" onClick={handleSaveSurvey}>Lưu kết quả khảo sát</Button>
          </>
        }
      >
        <Input
          label="Thời điểm khảo sát thực tế"
          type="datetime-local"
          value={surveyData.surveyDate}
          onChange={(e) => setSurveyData((p) => ({ ...p, surveyDate: e.target.value }))}
        />
        <Textarea
          label="Hiện trạng hư hỏng ghi nhận tại hiện trường"
          required
          rows={3}
          value={surveyData.findings}
          onChange={(e) => setSurveyData((p) => ({ ...p, findings: e.target.value }))}
          placeholder="Quạt gió dàn nóng không quay, máy báo lỗi CH-05 trên bảng điều khiển..."
        />
        <Textarea
          label="Nguyên nhân hoặc nhận định nguyên nhân"
          required
          rows={2}
          value={surveyData.rootCause}
          onChange={(e) => setSurveyData((p) => ({ ...p, rootCause: e.target.value }))}
          placeholder="Chập IC điều khiển do ẩm mốc, bo mạch bị ẩm sau đợt mưa..."
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Select
            label="Mức độ hư hỏng"
            value={surveyData.damageLevel}
            onChange={(e) => setSurveyData((p) => ({ ...p, damageLevel: e.target.value }))}
            options={['Nhẹ (Khắc phục nhanh)', 'Trung bình', 'Nghiêm trọng (Hỏng toàn bộ cụm)']}
          />
        </div>
      </Modal>

      {/* 5. Modal Lập phương án xử lý (Staff) */}
      <Modal
        isOpen={modalType === 'plan'}
        onClose={() => setModalType(null)}
        title="Lập phương án sửa chữa"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button variant="primary" onClick={handleSavePlan}>Trình phương án</Button>
          </>
        }
      >
        <Input
          label="Tên phương án xử lý"
          required
          value={planData.title}
          onChange={(e) => setPlanData((p) => ({ ...p, title: e.target.value }))}
          placeholder="VD: Thay thế tụ điện và vệ sinh dàn nóng"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Select
            label="Hình thức sửa chữa"
            value={planData.repairType}
            onChange={(e) => setPlanData((p) => ({ ...p, repairType: e.target.value }))}
            options={[
              { value: REPAIR_TYPE.INTERNAL, label: 'Sửa chữa nội bộ (Tổ kỹ thuật CSVC)' },
              { value: REPAIR_TYPE.EXTERNAL, label: 'Thuê ngoài (Chuyển BP Mua sắm & Đấu thầu)' },
            ]}
          />

          <Input
            label="Dự toán chi phí (VND)"
            type="number"
            value={planData.estimatedCost}
            onChange={(e) => setPlanData((p) => ({ ...p, estimatedCost: e.target.value }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input
            label="Thời gian thực hiện dự kiến"
            value={planData.estimatedDuration}
            onChange={(e) => setPlanData((p) => ({ ...p, estimatedDuration: e.target.value }))}
            placeholder="VD: 2 ngày làm việc"
          />

          <Input
            label="Vật tư / Thiết bị cần mua"
            value={planData.materials}
            onChange={(e) => setPlanData((p) => ({ ...p, materials: e.target.value }))}
            placeholder="VD: Bo mạch Panasonic 1.5HP"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={planData.needsApproval || planData.repairType === REPAIR_TYPE.EXTERNAL}
              disabled={planData.repairType === REPAIR_TYPE.EXTERNAL}
              onChange={(e) => setPlanData((p) => ({ ...p, needsApproval: e.target.checked }))}
            />
            <span>Cần trình Ban Giám hiệu phê duyệt {planData.repairType === REPAIR_TYPE.EXTERNAL ? '(Thuê ngoài bắt buộc duyệt)' : '(Chi phí > 1.000.000đ)'}</span>
          </label>
        </div>
      </Modal>

      {/* 6. Modal Từ chối phương án (Director) */}
      <Modal
        isOpen={modalType === 'reject'}
        onClose={() => setModalType(null)}
        title="Từ chối phê duyệt phương án"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button variant="danger" onClick={handleReject}>Xác nhận từ chối</Button>
          </>
        }
      >
        <Textarea
          label="Lý do từ chối (bắt buộc)"
          required
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Dự toán chi phí quá cao, đề nghị tham khảo lại báo giá hoặc tận dụng linh kiện cũ..."
          rows={4}
        />
      </Modal>

      {/* 7. Modal Cập nhật kết quả sửa chữa nội bộ (Staff) */}
      <Modal
        isOpen={modalType === 'internal_result'}
        onClose={() => setModalType(null)}
        title="Cập nhật kết quả sửa chữa nội bộ"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button variant="primary" onClick={handleSaveInternalResult}>Hoàn thành & Báo người gửi xác nhận</Button>
          </>
        }
      >
        <Textarea
          label="Nội dung công việc kỹ thuật đã thực hiện"
          required
          value={internalResultData.workDone}
          onChange={(e) => setInternalResultData((p) => ({ ...p, workDone: e.target.value }))}
          placeholder="Đã tháo vệ sinh lưới lọc, thay tụ quạt 2.5uF, bơm bổ sung gas R32..."
          rows={3}
        />
        <Input
          label="Linh kiện / Vật tư đã sử dụng"
          value={internalResultData.partsReplaced}
          onChange={(e) => setInternalResultData((p) => ({ ...p, partsReplaced: e.target.value }))}
          placeholder="Tụ quạt 2.5uF, băng dính điện"
        />
        <Input
          label="Kết quả chạy thử"
          value={internalResultData.testNotes}
          onChange={(e) => setInternalResultData((p) => ({ ...p, testNotes: e.target.value }))}
        />
      </Modal>

      {/* 8. Modal Người yêu cầu xác nhận kết quả nội bộ */}
      <Modal
        isOpen={modalType === 'requester_confirm'}
        onClose={() => setModalType(null)}
        title="Xác nhận kết quả sửa chữa nội bộ"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Đóng</Button>
            <Button
              variant={requesterConfirmData.result === 'PASS' ? 'primary' : 'danger'}
              onClick={handleRequesterConfirm}
            >
              {requesterConfirmData.result === 'PASS' ? 'Xác nhận hoàn thành' : 'Gửi phản hồi sửa lại'}
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Đánh giá kết quả thực tế:</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${requesterConfirmData.result === 'PASS' ? 'var(--color-green)' : 'var(--color-border)'}`,
                backgroundColor: requesterConfirmData.result === 'PASS' ? 'var(--color-green-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <input
                type="radio"
                name="rqRes"
                checked={requesterConfirmData.result === 'PASS'}
                onChange={() => setRequesterConfirmData((p) => ({ ...p, result: 'PASS' }))}
              />
              Hài lòng (Đạt yêu cầu)
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${requesterConfirmData.result === 'FAIL' ? 'var(--color-danger)' : 'var(--color-border)'}`,
                backgroundColor: requesterConfirmData.result === 'FAIL' ? 'var(--color-danger-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <input
                type="radio"
                name="rqRes"
                checked={requesterConfirmData.result === 'FAIL'}
                onChange={() => setRequesterConfirmData((p) => ({ ...p, result: 'FAIL' }))}
              />
              Chưa hài lòng / Còn lỗi
            </label>
          </div>
        </div>

        <Textarea
          label={requesterConfirmData.result === 'PASS' ? 'Nhận xét' : 'Mô tả chi tiết điểm chưa đạt (bắt buộc)'}
          value={requesterConfirmData.feedback}
          onChange={(e) => setRequesterConfirmData((p) => ({ ...p, feedback: e.target.value }))}
          rows={3}
        />
      </Modal>

      {/* 9. Modal Cập nhật thi công thuê ngoài (Procurement) */}
      <Modal
        isOpen={modalType === 'external_update'}
        onClose={() => setModalType(null)}
        title="Cập nhật thông tin thi công thuê ngoài"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button variant="primary" onClick={handleUpdateExternalWork}>Lưu cập nhật</Button>
          </>
        }
      >
        <Input
          label="Tên đơn vị thi công bên ngoài"
          required
          value={externalUpdateData.contractor}
          onChange={(e) => setExternalUpdateData((p) => ({ ...p, contractor: e.target.value }))}
          placeholder="VD: Công ty TNHH Kỹ thuật Cơ điện Đà Nẵng"
        />

        <Input
          label="Người liên hệ / Số điện thoại nhà thầu"
          value={externalUpdateData.contractorContact}
          onChange={(e) => setExternalUpdateData((p) => ({ ...p, contractorContact: e.target.value }))}
          placeholder="0905123456"
        />

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Tiến độ thi công (%): {externalUpdateData.progress}%</label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            style={{ width: '100%' }}
            value={externalUpdateData.progress}
            onChange={(e) => setExternalUpdateData((p) => ({ ...p, progress: Number(e.target.value) }))}
          />
        </div>

        <Textarea
          label="Ghi chú thi công / Báo cáo tuần"
          value={externalUpdateData.workNotes}
          onChange={(e) => setExternalUpdateData((p) => ({ ...p, workNotes: e.target.value }))}
          placeholder="Đã nhập vật tư bo mạch mới, đang tiến hành đấu nối cáp nguồn..."
        />
      </Modal>

      {/* 10. Modal Nghiệm thu thực tế (Staff) */}
      <Modal
        isOpen={modalType === 'acceptance'}
        onClose={() => setModalType(null)}
        title="Biên bản nghiệm thu thực tế sửa chữa thuê ngoài"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>Hủy</Button>
            <Button
              variant={acceptanceData.result === 'PASS' ? 'success' : 'danger'}
              onClick={handleSubmitAcceptance}
            >
              {acceptanceData.result === 'PASS' ? 'Ghi nhận Nghiệm thu ĐẠT' : 'Yêu cầu khắc phục (KHÔNG ĐẠT)'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input
            label="Ngày kiểm tra thực tế"
            type="date"
            value={acceptanceData.inspectionDate}
            onChange={(e) => setAcceptanceData((p) => ({ ...p, inspectionDate: e.target.value }))}
          />

          <Input
            label="Cán bộ nghiệm thu"
            disabled
            value={currentUser?.name || 'Cán bộ kỹ thuật'}
          />
        </div>

        <Textarea
          label="Nội dung hạng mục kiểm tra thực tế"
          required
          rows={2}
          value={acceptanceData.checkItems}
          onChange={(e) => setAcceptanceData((p) => ({ ...p, checkItems: e.target.value }))}
          placeholder="Kiểm tra độ lạnh, nhiệt độ đo được tại cửa gió, dòng điện máy nén..."
        />

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Kết luận nghiệm thu kỹ thuật:</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${acceptanceData.result === 'PASS' ? 'var(--color-green)' : 'var(--color-border)'}`,
                backgroundColor: acceptanceData.result === 'PASS' ? 'var(--color-green-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: acceptanceData.result === 'PASS' ? 'var(--color-green)' : 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="accRes"
                checked={acceptanceData.result === 'PASS'}
                onChange={() => setAcceptanceData((p) => ({ ...p, result: 'PASS' }))}
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
                border: `2px solid ${acceptanceData.result === 'FAIL' ? 'var(--color-danger)' : 'var(--color-border)'}`,
                backgroundColor: acceptanceData.result === 'FAIL' ? 'var(--color-danger-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: acceptanceData.result === 'FAIL' ? 'var(--color-danger)' : 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="accRes"
                checked={acceptanceData.result === 'FAIL'}
                onChange={() => setAcceptanceData((p) => ({ ...p, result: 'FAIL' }))}
              />
              KHÔNG ĐẠT (YÊU CẦU KHẮC PHỤC)
            </label>
          </div>
        </div>

        <Textarea
          label="Đánh giá chi tiết"
          rows={2}
          value={acceptanceData.notes}
          onChange={(e) => setAcceptanceData((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Nhiệt độ phòng đạt 24 độ C sau 15 phút, máy chạy êm không rung..."
        />

        {acceptanceData.result === 'FAIL' && (
          <div style={{ marginTop: 12 }}>
            <Textarea
              label="Nội dung bắt buộc đơn vị thi công phải khắc phục (bắt buộc)"
              required
              rows={3}
              value={acceptanceData.remediationNotes}
              onChange={(e) => setAcceptanceData((p) => ({ ...p, remediationNotes: e.target.value }))}
              placeholder="Đường ống đồng bị hở rò rỉ gas tại co nối dàn lạnh, yêu cầu hàn lại và bổ sung gas trước ngày..."
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

const cardStyle = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  padding: 24,
  boxShadow: 'var(--shadow-sm)',
};

const cardTitleStyle = {
  fontSize: '1rem',
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '1px solid var(--color-border-light)',
};

