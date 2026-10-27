import { PRIORITY_LABELS, PRIORITY_COLORS } from '../hang-so/priorities';

export default function PriorityBadge({ priority, className = '' }) {
  const label = PRIORITY_LABELS[priority] || priority;
  const colors = PRIORITY_COLORS[priority] || { bg: '#F0F3F7', text: '#65748B', border: '#D5DCE5' };

  return (
    <span
      className={`status-badge priority-badge ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: colors.text,
          marginRight: 6,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

