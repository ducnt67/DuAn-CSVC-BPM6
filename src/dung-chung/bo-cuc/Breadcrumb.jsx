import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import { ROLES } from '../hang-so/roles';
import './Breadcrumb.css';

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

export default function Breadcrumb({ isLight = false }) {
  const location = useLocation();
  const { currentUser } = useApp();
  const isRequester = currentUser?.role === ROLES.REQUESTER;
  const isStaff = currentUser?.role === ROLES.STAFF;
  const homePath = isRequester ? '/my-requests' : isStaff ? '/repair-plans' : '/dashboard';
  const homeLabel = isRequester
    ? 'Yêu cầu của tôi'
    : isStaff
      ? 'Phương án sửa chữa'
      : 'Bảng điều khiển';

  const pathnames = location.pathname.split('/').filter((x) => x);

  if (
    pathnames.length === 0 ||
    (pathnames[0] === 'dashboard' && !isRequester && !isStaff) ||
    (pathnames[0] === 'my-requests' && isRequester) ||
    (pathnames[0] === 'repair-plans' && isStaff)
  ) {
    return (
      <div className={`due-breadcrumb ${isLight ? 'breadcrumb-dark-text' : 'breadcrumb-light-text'}`}>
        <Home size={15} />
        <span className="breadcrumb-current-text">{homeLabel}</span>
      </div>
    );
  }

  return (
    <nav className={`due-breadcrumb ${isLight ? 'breadcrumb-dark-text' : 'breadcrumb-light-text'}`}>
      <Link to={homePath} className="breadcrumb-home-link" title="Về trang chủ">
        <Home size={15} />
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[name] || name;

        return (
          <span key={name} className="breadcrumb-segment">
            <ChevronRight size={13} className="breadcrumb-chevron" />
            {isLast ? (
              <span className="breadcrumb-current-text">{label}</span>
            ) : (
              <Link to={routeTo} className="breadcrumb-parent-link">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
