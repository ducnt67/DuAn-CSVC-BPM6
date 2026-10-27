import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận thao tác',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'primary', // 'primary', 'danger', 'warning'
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor:
              variant === 'danger'
                ? 'var(--color-danger-light)'
                : variant === 'warning'
                ? 'var(--color-warning-light)'
                : 'var(--color-blue-light)',
            color:
              variant === 'danger'
                ? 'var(--color-danger)'
                : variant === 'warning'
                ? 'var(--color-warning)'
                : 'var(--color-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {variant === 'danger' || variant === 'warning' ? (
            <AlertTriangle size={22} />
          ) : (
            <Info size={22} />
          )}
        </div>
        <div style={{ flex: 1, fontSize: 'var(--font-size-base)', color: 'var(--color-text)' }}>
          {message}
        </div>
      </div>
    </Modal>
  );
}

