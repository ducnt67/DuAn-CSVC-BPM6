let counter = Date.now();

export function generateId(prefix = 'ID') {
  counter += 1;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${rand}${counter.toString().slice(-4)}`;
}

export function generateRequestId() {
  return generateId('YC');
}

export function generatePlanId() {
  return generateId('PA');
}

export function generateExternalWorkId() {
  return generateId('TN');
}

