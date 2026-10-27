export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const PRIORITY_LABELS = {
  [PRIORITY.LOW]: 'Thấp',
  [PRIORITY.MEDIUM]: 'Trung bình',
  [PRIORITY.HIGH]: 'Cao',
  [PRIORITY.URGENT]: 'Khẩn cấp',
};

export const PRIORITY_COLORS = {
  [PRIORITY.LOW]: { bg: '#F0F3F7', text: '#65748B', border: '#D5DCE5' },
  [PRIORITY.MEDIUM]: { bg: '#EAF4FF', text: '#1677C8', border: '#B8D9F5' },
  [PRIORITY.HIGH]: { bg: '#FFF1E5', text: '#D97B0D', border: '#F5D4A8' },
  [PRIORITY.URGENT]: { bg: '#FFF0F0', text: '#D64545', border: '#F5B8B8' },
};

