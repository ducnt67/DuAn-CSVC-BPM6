import { MOCK_USERS } from '../../du-lieu-demo/mockUsers';
import { apiRequest } from './apiClient';

function getDemoUser(username) {
  return MOCK_USERS.find((user) => user.username === username) || {};
}

export function normalizeUser(user) {
  const demo = getDemoUser(user.username);
  const name = user.name || user.first_name || user.username;
  return {
    ...demo,
    ...user,
    id: user.id,
    name,
    initials: name
      .split(' ')
      .map((part) => part[0])
      .slice(-2)
      .join(''),
    userTypeLabel: demo.userTypeLabel || user.roleTitle || user.role,
    roleDescription: demo.roleDescription || '',
  };
}

export function normalizeFacility(facility) {
  return {
    ...facility,
    code: facility.id,
    room: facility.location || '',
    department: facility.managedBy || '',
    status: normalizeFacilityDisplayStatus(facility.status),
  };
}

function normalizeRequest(request) {
  const result = {
    ...request,
    survey: request.survey || request.surveyData || null,
    surveyData: request.surveyData || request.survey || null,
    acceptanceHistory: request.acceptanceHistory || request.acceptanceRecords || [],
    acceptanceRecords: request.acceptanceRecords || request.acceptanceHistory || [],
    history: (request.history || []).map((item) => ({
      ...item,
      actor: item.actor || item.performedBy || 'Hệ thống',
      detail: item.detail || item.note || '',
      date: item.date || item.timestamp,
    })),
  };
  if (result.contractHandling) {
    result.contractHandling = {
      ...result.contractHandling,
      paymentSuspensionUntil: result.contractHandling.paymentSuspensionUntil || '',
      contractExtensionUntil: result.contractHandling.contractExtensionUntil || '',
    };
  }
  return result;
}

function normalizeExternalWork(work) {
  return {
    ...work,
    contractorPhone: work.contractorPhone || work.contractorContact || '',
    contractorContact: work.contractorContact || work.contractorPhone || '',
    notes: work.notes || work.workNotes || '',
    workNotes: work.workNotes || work.notes || '',
  };
}

async function getAllPages(path) {
  const results = [];
  let next = path;
  while (next) {
    const page = await apiRequest(next);
    if (Array.isArray(page)) return page;
    if (!Array.isArray(page.results)) {
      throw new Error(`Phản hồi danh sách từ ${path} không đúng định dạng.`);
    }
    results.push(...page.results);
    next = page.next;
  }
  return results;
}

export async function loadBackendData() {
  const [users, facilities, rawRequests, rawPlans, rawWorks, notifications] = await Promise.all([
    getAllPages('/users/'),
    getAllPages('/facilities/'),
    getAllPages('/requests/'),
    getAllPages('/repair-plans/'),
    getAllPages('/external-works/'),
    getAllPages('/notifications/'),
  ]);
  return {
    users: users.map(normalizeUser),
    facilities: facilities.map(normalizeFacility),
    requests: rawRequests.map(normalizeRequest),
    repairPlans: rawPlans,
    externalWorks: rawWorks.map(normalizeExternalWork),
    notifications: notifications.map((item) => ({
      ...item,
      targetId: item.targetId || null,
    })),
  };
}

export async function createRequest(request) {
  const payload = {
    title: request.title,
    facilityId: request.facilityId || '',
    facilityName: request.facilityName || '',
    facilityType: request.facilityType || '',
    building: request.building,
    location: request.location,
    requesterName: request.requesterName,
    requesterType: request.requesterType || '',
    department: request.department || '',
    contactInfo: request.contactInfo || request.contactPhone || '',
    description: request.description,
    impact: request.impact || '',
    discoveredAt: request.discoveredAt || null,
    priority: request.priority,
    attachments: request.attachments || [],
  };
  return normalizeRequest(await apiRequest('/requests/', { method: 'POST', body: payload }));
}

export async function createFacility(facility) {
  const payload = {
    id: facility.code || facility.id,
    name: facility.name,
    type: facility.type,
    building: facility.building,
    location: facility.room || facility.location || '',
    managedBy: facility.department || facility.managedBy || '',
    status: normalizeFacilityStatus(facility.status),
    description: facility.description || '',
  };
  return normalizeFacility(await apiRequest('/facilities/', { method: 'POST', body: payload }));
}

export async function updateFacility(facility) {
  const payload = {
    id: facility.code || facility.id,
    name: facility.name,
    type: facility.type,
    building: facility.building,
    location: facility.room || facility.location || '',
    managedBy: facility.department || facility.managedBy || '',
    status: normalizeFacilityStatus(facility.status),
    description: facility.description || '',
  };
  return normalizeFacility(
    await apiRequest(`/facilities/${encodeURIComponent(facility.id)}/`, {
      method: 'PATCH',
      body: payload,
    })
  );
}

function normalizeFacilityStatus(status) {
  if (status === 'Hoạt động bình thường' || status === 'Đang hoạt động') return 'ACTIVE';
  if (status === 'Đang sửa chữa' || status === 'Đang có sự cố') return 'UNDER_REPAIR';
  if (status === 'Ngưng hoạt động' || status === 'Hỏng hóc ngưng sử dụng') return 'INACTIVE';
  if (status === 'Cần kiểm tra bảo dưỡng') return 'ACTIVE';
  return status || 'ACTIVE';
}

function normalizeFacilityDisplayStatus(status) {
  if (status === 'ACTIVE') return 'Hoạt động bình thường';
  if (status === 'UNDER_REPAIR') return 'Đang có sự cố';
  if (status === 'INACTIVE') return 'Hỏng hóc ngưng sử dụng';
  return status || 'Hoạt động bình thường';
}

function getLatestNote(updates) {
  const history = updates.history;
  if (!Array.isArray(history) || history.length === 0) return '';
  const latest = history[history.length - 1];
  return String(latest.detail || latest.note || '').trim();
}

function getLatestPlan(request) {
  return request?.repairPlans?.[0] || null;
}

export function createPendingPlanMap() {
  return new Map();
}

export function stageRepairPlan(pendingPlans, requestId, plan) {
  pendingPlans.set(requestId, plan);
}

export function stageExternalWork(pendingWorks, requestId, work) {
  pendingWorks.set(requestId, work);
}

export async function persistRequestUpdate(request, updates, pendingPlans, pendingWorks) {
  const code = encodeURIComponent(request.id);
  const status = updates.status;
  const note = getLatestNote(updates);
  let result;

  if (status === 'ACCEPTED') {
    result = request.status === 'NEEDS_INFORMATION'
      ? await apiRequest(`/requests/${code}/supplement/`, { method: 'POST', body: { note } })
      : await apiRequest(`/requests/${code}/accept/`, { method: 'POST' });
  } else if (status === 'NEEDS_INFORMATION') {
    result = await apiRequest(`/requests/${code}/request-information/`, {
      method: 'POST',
      body: { note },
    });
  } else if (status === 'SURVEYING') {
    result = await apiRequest(`/requests/${code}/assign/`, {
      method: 'POST',
      body: { staffId: updates.assignedStaffId },
    });
  } else if (updates.approvalStatus === 'REJECTED') {
    result = await apiRequest(`/requests/${code}/reject/`, {
      method: 'POST',
      body: { reason: updates.rejectionReason || note },
    });
  } else if (updates.approvalStatus === 'APPROVED') {
    result = await apiRequest(`/requests/${code}/approve/`, { method: 'POST' });
  } else if (status === 'WAITING_FOR_PLAN' && (updates.survey || updates.surveyData)) {
    const survey = updates.survey || updates.surveyData;
    result = await apiRequest(`/requests/${code}/survey/`, {
      method: 'POST',
      body: {
        surveyDate: survey.surveyDate || survey.inspectionDate || new Date().toISOString(),
        findings: survey.findings || survey.currentCondition || '',
        rootCause: survey.rootCause || survey.cause || '',
        damageLevel: survey.damageLevel || '',
        recommendedAction: survey.recommendedAction || survey.recommendation || '',
        estimatedTime: survey.estimatedTime || '',
        estimatedCost: survey.estimatedCost ?? null,
        notes: survey.notes || '',
      },
    });
  } else if (
    updates.planId ||
    (pendingPlans.has(request.id) && ['WAITING_FOR_APPROVAL', 'INTERNAL_REPAIR'].includes(status))
  ) {
    const plan = pendingPlans.get(request.id);
    if (!plan) throw new Error('Không tìm thấy dữ liệu phương án cần lưu.');
    result = await apiRequest(`/requests/${code}/repair-plan/`, {
      method: 'POST',
      body: {
        title: plan.title,
        repairType: plan.repairType,
        estimatedCost: plan.estimatedCost,
        estimatedDuration: plan.estimatedDuration || plan.estimatedTime || '',
        materials: plan.materials || '',
        description: plan.description || '',
        needsApproval: Boolean(plan.needsApproval || plan.requiresApproval),
      },
    });
    pendingPlans.delete(request.id);
  } else if (
    status === 'WAITING_FOR_ACCEPTANCE' &&
    updates.remediationResponseReceived
  ) {
    result = await apiRequest(`/requests/${code}/provider-response/`, {
      method: 'POST',
      body: {
        responseDate: updates.remediationResponseDate,
        responseNote: updates.remediationResponseNote || note,
      },
    });
  } else if (
    updates.acceptanceRecords?.length > (request.acceptanceRecords || []).length ||
    (updates.acceptanceResult && updates.acceptanceResult !== request.acceptanceResult)
  ) {
    const record = updates.acceptanceRecords?.at(-1) || {};
    result = await apiRequest(`/requests/${code}/acceptance/`, {
      method: 'POST',
      body: {
        inspectionDate: record.inspectionDate || record.date || new Date().toISOString().slice(0, 10),
        checkItems: record.checkItems || record.content || '',
        result: record.result || updates.acceptanceResult,
        notes: record.notes || record.comments || '',
        remediationNotes: record.remediationNotes || updates.remediationNotes || '',
      },
    });
  } else if (status === 'OVERDUE_REMEDIATION' && updates.contractHandling) {
    result = await apiRequest(`/requests/${code}/contract-handling/`, {
      method: 'POST',
      body: updates.contractHandling,
    });
  } else if (status === 'WAITING_FOR_ACCEPTANCE') {
    const work = pendingWorks.get(request.id) || request.externalWorks?.[0] || null;
    result = await apiRequest(`/requests/${code}/external-work-done/`, {
      method: 'POST',
      body: { workResult: work?.workResult || 'Đơn vị thi công báo hoàn thành công việc.' },
    });
    pendingWorks.delete(request.id);
  } else if (status === 'EXTERNAL_WORK_IN_PROGRESS') {
    const work = pendingWorks.get(request.id);
    if (!work) throw new Error('Không tìm thấy thông tin công việc thuê ngoài cần lưu.');
    result = await apiRequest(`/requests/${code}/update-external-work/`, {
      method: 'POST',
      body: {
        contractor: work.contractor || updates.contractor,
        contractorContact: work.contractorContact || work.contractorPhone || '',
        startDate: work.startDate || null,
        expectedEndDate: work.expectedEndDate || null,
        progress: work.progress ?? updates.externalProgress ?? 0,
        workNotes: work.workNotes || work.notes || '',
        workResult: work.workResult || '',
      },
    });
    pendingWorks.delete(request.id);
  } else if (status === 'WAITING_REMEDIATION_RESPONSE' || status === 'NEEDS_REMEDIATION') {
    const record = updates.acceptanceRecords?.at(-1) || {};
    result = await apiRequest(`/requests/${code}/acceptance/`, {
      method: 'POST',
      body: {
        inspectionDate: record.inspectionDate || record.date || new Date().toISOString().slice(0, 10),
        checkItems: record.checkItems || record.content || '',
        result: 'FAIL',
        notes: record.notes || record.comments || '',
        remediationNotes: record.remediationNotes || updates.remediationNotes || '',
      },
    });
  } else if (status === 'COMPLETED') {
    result = await apiRequest(`/requests/${code}/confirm/`, {
      method: 'POST',
      body: {
        result: 'PASS',
        feedback: note,
      },
    });
  } else if (status === 'INTERNAL_REPAIR' && request.status === 'WAITING_FOR_CONFIRMATION') {
    result = await apiRequest(`/requests/${code}/confirm/`, {
      method: 'POST',
      body: { result: 'FAIL', feedback: note },
    });
  } else if (status === 'WAITING_FOR_CONFIRMATION') {
    result = await apiRequest(`/requests/${code}/internal-result/`, {
      method: 'POST',
      body: updates.internalRepairResult || {},
    });
  } else if (status === 'CANCELLED') {
    result = await apiRequest(`/requests/${code}/cancel/`, { method: 'POST' });
  } else if (updates.remediationDeadline && request.status === 'WAITING_REMEDIATION_RESPONSE') {
    result = await apiRequest(`/requests/${code}/simulate-overdue/`, { method: 'POST' });
  } else if (status === request.status) {
    return request;
  } else {
    throw new Error(`Chưa hỗ trợ lưu thay đổi trạng thái ${request.status} → ${status || 'không đổi'}.`);
  }
  return normalizeRequest(result);
}

export async function persistNotificationChanges(previous, next) {
  const previousIds = new Set(previous.map((item) => item.id));
  if (next.length === 0 && previous.length > 0) {
    await Promise.all(previous.map((item) =>
      apiRequest(`/notifications/${encodeURIComponent(item.id)}/`, { method: 'DELETE' })
    ));
    return;
  }
  const added = next.filter((item) => !previousIds.has(item.id));
  if (added.length > 0) return;
  const readItems = next.filter(
    (item) => item.read && previousIds.has(item.id) && !previous.find((old) => old.id === item.id)?.read
  );
  if (readItems.length === previous.filter((item) => !item.read).length && readItems.length > 1) {
    await apiRequest('/notifications/mark-all-read/', { method: 'POST' });
    return;
  }
  await Promise.all(readItems.map((item) =>
    apiRequest(`/notifications/${encodeURIComponent(item.id)}/mark-read/`, { method: 'POST' })
  ));
}
