import { STATUS_LABELS, STATUS_COLORS } from '../hang-so/statuses';
import './StatusBadge.css';

export default function StatusBadge({ status, className = '' }) {
  const label = STATUS_LABELS[status] || status;
  const colors = STATUS_COLORS[status] || { bg: '#F0F3F7', text: '#65748B', border: '#D5DCE5' };

  return (
    <span
      className={`status-badge ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {label}
    </span>
  );
}

