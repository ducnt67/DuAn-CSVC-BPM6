import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có bản ghi nào phù hợp với điều kiện tìm kiếm.',
  actionLabel,
  onAction,
  actionIcon,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--color-border)',
        margin: '16px 0',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'var(--color-surface-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-secondary)',
          marginBottom: 16,
        }}
      >
        <Icon size={28} />
      </div>
      <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 6 }}>
        {title}
      </h4>
      <p
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          maxWidth: 400,
          marginBottom: actionLabel ? 20 : 0,
        }}
      >
        {description}
      </p>
      {actionLabel && (
        <Button variant="primary" icon={actionIcon} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

