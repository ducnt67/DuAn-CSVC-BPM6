import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import './Toast.css';

export default function Toast() {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        let iconColor = 'var(--color-green)';
        if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'var(--color-danger)';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          iconColor = 'var(--color-warning)';
        } else if (toast.type === 'info') {
          Icon = Info;
          iconColor = 'var(--color-blue)';
        }

        return (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={18} style={{ color: iconColor, flexShrink: 0 }} />
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Đóng"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

