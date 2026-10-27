import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import { Link } from 'react-router-dom';

export default function NotificationPanel() {
  const { notifications, setNotifications } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thông báo"
        title="Thông báo hệ thống"
      >
        <Bell size={16} />
        {unreadCount > 0 && <span className="topbar-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 460,
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Thông báo ({notifications.length})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-blue)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Check size={14} /> Đã đọc
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Trash2 size={13} /> Xóa
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Không có thông báo mới nào
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: item.read ? 'transparent' : 'var(--color-surface-muted)',
                    marginBottom: 4,
                    fontSize: '0.8125rem',
                    borderLeft: item.read ? 'none' : '3px solid var(--color-primary)',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
                    {item.title}
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                    {item.message}
                  </div>
                  {item.targetId && (
                    <Link
                      to={`/requests/${item.targetId}`}
                      onClick={() => setIsOpen(false)}
                      style={{
                        display: 'inline-block',
                        marginTop: 4,
                        fontSize: '0.75rem',
                        color: 'var(--color-blue)',
                        fontWeight: 500,
                      }}
                    >
                      Xem chi tiết →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

