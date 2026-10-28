import { Link } from 'react-router-dom';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import { ROLES } from '../hang-so/roles';
import './PortalShortcuts.css';

/**
 * PortalShortcuts component matching the quick navigation card pills in Image 2:
 * "▶ Nghiệp vụ Sinh viên Tổng hợp", "▶ Thực tập tốt nghiệp", "▶ Các lớp Giảng viên theo kì học"
 */
export default function PortalShortcuts() {
  const { currentUser } = useApp();
  const role = currentUser?.role;

  // Role-appropriate quick shortcuts
  const shortcuts = [
    {
      label: 'Tạo yêu cầu báo hỏng CSVC & phòng học',
      path: '/requests/create',
      visible: [ROLES.REQUESTER, ROLES.FACILITY_ADMIN, ROLES.STAFF].includes(role),
    },
    {
      label: 'Tra cứu danh mục thiết bị, điều hòa & máy chiếu',
      path: '/facilities',
      visible: [ROLES.FACILITY_ADMIN, ROLES.STAFF, ROLES.PROCUREMENT].includes(role),
    },
    {
      label: 'Hộp thư phê duyệt phương án Ban Giám hiệu',
      path: '/approvals',
      visible: [ROLES.DIRECTOR, ROLES.FACILITY_ADMIN].includes(role),
    },
    {
      label: 'Không gian xử lý & khảo sát sự cố kỹ thuật',
      path: '/repair-work',
      visible: [ROLES.STAFF, ROLES.FACILITY_ADMIN].includes(role),
    },
    {
      label: 'Quản lý thi công & hồ sơ nhà thầu thuê ngoài',
      path: '/external-work',
      visible: [ROLES.PROCUREMENT, ROLES.STAFF].includes(role),
    },
    {
      label: 'Kiểm tra hiện trường & lập biên bản nghiệm thu',
      path: '/acceptance',
      visible: [ROLES.STAFF, ROLES.FACILITY_ADMIN].includes(role),
    },
    {
      label: 'Báo cáo chỉ số KPI & kinh phí theo tòa nhà',
      path: '/reports',
      visible: [ROLES.DIRECTOR, ROLES.FACILITY_ADMIN].includes(role),
    },
    {
      label: 'Theo dõi sự cố do tôi báo cáo (My Requests)',
      path: '/my-requests',
      visible: role === ROLES.REQUESTER,
    },
  ].filter(s => s.visible).slice(0, 4);

  return (
    <div className="portal-shortcuts-wrapper">
      <div className="portal-shortcuts-grid">
        {shortcuts.map((item, idx) => (
          <Link key={idx} to={item.path} className="portal-shortcut-card">
            <span className="portal-shortcut-arrow">&#9658;</span>
            <span className="portal-shortcut-text">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
