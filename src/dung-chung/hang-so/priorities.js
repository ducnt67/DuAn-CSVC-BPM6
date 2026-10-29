export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const PRIORITY_LABELS = {
  [PRIORITY.LOW]: 'Xử lý sau',
  [PRIORITY.MEDIUM]: 'Xử lý sớm',
  [PRIORITY.HIGH]: 'Khẩn cấp',
  [PRIORITY.URGENT]: 'Khẩn cấp',
};

export const PRIORITY_COLORS = {
  [PRIORITY.LOW]: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
  [PRIORITY.MEDIUM]: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
  [PRIORITY.HIGH]: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  [PRIORITY.URGENT]: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
};

