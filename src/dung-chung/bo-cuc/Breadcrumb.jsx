import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  dashboard: 'Bảng điều khiển',
  requests: 'Danh sách yêu cầu',
  'my-requests': 'Yêu cầu của tôi',
  create: 'Tạo yêu cầu',
  'repair-work': 'Công việc sửa chữa',
  'repair-plans': 'Phương án sửa chữa',
  approvals: 'Phê duyệt phương án',
  'external-work': 'Công việc thuê ngoài',
  acceptance: 'Nghiệm thu',
  facilities: 'Cơ sở vật chất',
  reports: 'Báo cáo & Thống kê',
};

export default function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || pathnames[0] === 'dashboard') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
        <Home size={15} />
        <span>Bảng điều khiển</span>
      </div>
    );
  }

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
        <Home size={15} />
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[name] || name;

        return (
          <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} />
            {isLast ? (
              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{label}</span>
            ) : (
              <Link to={routeTo} style={{ color: 'inherit' }}>
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

