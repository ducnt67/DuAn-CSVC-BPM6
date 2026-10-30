export function updateExternalWorkInList(works, id, updates) {
  return works.map((work) =>
    work.id === id ? { ...work, ...updates } : work
  );
}

export function addExternalWorkToList(works, work) {
  return [work, ...works];
}

export function isExternalWorkOverdue(work, now = new Date()) {
  if (!work?.expectedEndDate || Number(work.progress) >= 100) return false;

  const expectedEndDate = new Date(work.expectedEndDate);
  if (Number.isNaN(expectedEndDate.getTime())) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  expectedEndDate.setHours(0, 0, 0, 0);

  const overdueDays = Math.floor((today.getTime() - expectedEndDate.getTime()) / 86400000);
  return overdueDays > 5;
}

export function getEffectiveExternalWorkStatus(work, now = new Date()) {
  return isExternalWorkOverdue(work, now)
    ? 'OVERDUE'
    : work?.status;
}
