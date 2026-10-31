import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '../../dung-chung/thanh-phan/Button';
import { useApp } from '../bo-cung-cap/AppContext';
import { ROLES } from '../../dung-chung/hang-so/roles';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const isStaff = currentUser?.role === ROLES.STAFF;
  const homePath = isStaff ? '/repair-plans' : '/dashboard';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: '5rem',
          fontWeight: 900,
          color: 'var(--color-primary)',
          lineHeight: 1,
          marginBottom: 12,
        }}
      >
        404
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>
        Trang không tồn tại
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 420, marginBottom: 24, fontSize: '0.9rem' }}>
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được chuyển sang địa chỉ khác.
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>
          Quay lại
        </Button>
        <Button variant="primary" icon={Home} onClick={() => navigate(homePath)}>
          {isStaff ? 'Về phương án sửa chữa' : 'Về bảng điều khiển'}
        </Button>
      </div>
    </div>
  );
}
