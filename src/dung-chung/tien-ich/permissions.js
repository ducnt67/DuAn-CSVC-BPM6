import { ROLES } from '../hang-so/roles';
import { REQUEST_STATUS } from '../hang-so/statuses';

/* ===== Request-level permission checks ===== */

export function canAcceptRequest(request, currentUser) {
  return (
    request.status === REQUEST_STATUS.NEW &&
    currentUser.role === ROLES.FACILITY_ADMIN
  );
}

export function canRequestInfo(request, currentUser) {
  return (
    [REQUEST_STATUS.NEW, REQUEST_STATUS.ACCEPTED].includes(request.status) &&
    currentUser.role === ROLES.FACILITY_ADMIN
  );
}

export function canAssignStaff(request, currentUser) {
  return (
    [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.NEW].includes(request.status) &&
    currentUser.role === ROLES.FACILITY_ADMIN
  );
}

export function canSurvey(request, currentUser) {
  return (
    [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.SURVEYING].includes(request.status) &&
    currentUser.role === ROLES.STAFF &&
    currentUser.id === request.assignedStaffId
  );
}

export function canCreatePlan(request, currentUser) {
  return false;
}

export function canApprovePlan(request, currentUser) {
  return (
    request.status === REQUEST_STATUS.WAITING_FOR_APPROVAL &&
    currentUser.role === ROLES.DIRECTOR
  );
}

export function canStartInternalRepair(request, currentUser) {
  return (
    request.status === REQUEST_STATUS.INTERNAL_REPAIR &&
    currentUser.role === ROLES.STAFF &&
    currentUser.id === request.assignedStaffId
  );
}

export function canUpdateInternalResult(request, currentUser) {
  return (
    request.status === REQUEST_STATUS.INTERNAL_REPAIR &&
    currentUser.role === ROLES.STAFF &&
    currentUser.id === request.assignedStaffId &&
    request.repairType === 'INTERNAL'
  );
}

export function canConfirmInternalRepair(request, currentUser) {
  return (
    request.repairType === 'INTERNAL' &&
    request.status === REQUEST_STATUS.WAITING_FOR_CONFIRMATION &&
    currentUser.role === ROLES.REQUESTER &&
    currentUser.id === request.requesterId
  );
}

export function canRejectInternalResult(request, currentUser) {
  return canConfirmInternalRepair(request, currentUser);
}

export function canSubmitAcceptance(request, currentUser) {
  return (
    request.repairType === 'EXTERNAL' &&
    [REQUEST_STATUS.WAITING_FOR_ACCEPTANCE, REQUEST_STATUS.NEEDS_REMEDIATION, REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE, REQUEST_STATUS.OVERDUE_REMEDIATION].includes(request.status) &&
    currentUser.role === ROLES.STAFF &&
    currentUser.id === request.assignedStaffId
  );
}

export function canConfirmExternalCompletion(request, currentUser) {
  return (
    request.repairType === 'EXTERNAL' &&
    request.status === REQUEST_STATUS.WAITING_FOR_ACCEPTANCE &&
    request.acceptanceResult === 'PASS' &&
    currentUser.role === ROLES.STAFF &&
    currentUser.id === request.assignedStaffId
  );
}

export function canUpdateExternalWork(request, currentUser) {
  return (
    [REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK, REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS, REQUEST_STATUS.NEEDS_REMEDIATION].includes(request.status) &&
    currentUser.role === ROLES.PROCUREMENT
  );
}

export function canCancelRequest(request, currentUser) {
  return (
    request.status === REQUEST_STATUS.NEW &&
    currentUser.role === ROLES.REQUESTER &&
    currentUser.id === request.requesterId
  );
}

export function canSupplementInfo(request, currentUser) {
  return (
    request.status === REQUEST_STATUS.NEEDS_INFORMATION &&
    currentUser.role === ROLES.REQUESTER &&
    currentUser.id === request.requesterId
  );
}
