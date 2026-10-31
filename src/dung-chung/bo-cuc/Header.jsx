import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, LogOut, RotateCcw,
  ChevronDown, LayoutDashboard, FileText
} from 'lucide-react';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import { ROLE_LABELS, ROLES } from '../hang-so/roles';
import UniversityLogo from '../thanh-phan/UniversityLogo';
import Breadcrumb from './Breadcrumb';
import NotificationPanel from './NotificationPanel';
import './Header.css';

export default function Header({ onToggleSidebar }) {
  const { currentUser, logout, resetDemoData, addToast } = useApp();
  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    addToast('Đã đăng xuất khỏi hệ thống thành công.', 'info');
    navigate('/login');
  };

  const handleResetData = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục lại dữ liệu mẫu ban đầu? Các thay đổi lưu tạm sẽ được thiết lập lại.')) {
      resetDemoData();
      addToast('Đã khôi phục dữ liệu mẫu thành công!', 'success');
    }
  };

  const initials = currentUser?.name
    ? currentUser.name
      .split(' ')
      .map((n) => n[0])
      .slice(-2)
      .join('')
    : 'DUE';

  return (
    <>
      {/* 1. Top Utility Bar */}
      <div className="app-topbar">
        <div className="topbar-right">
          {/* Notifications Panel */}
          <NotificationPanel />

          {/* User Avatar with Dropdown */}
          <div className="topbar-user-menu-container" ref={userMenuRef}>
            <button
              type="button"
              className="topbar-user-trigger"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              title={`Tài khoản: ${currentUser?.name}`}
            >
              <div className="topbar-user-avatar">
                {currentUser?.initials || initials}
              </div>
              <span className="topbar-user-meta">
                <span className="topbar-user-displayname">{currentUser?.name || 'Khách'}</span>
                <span className="topbar-user-role">
                  {ROLE_LABELS[currentUser?.role] || 'Khách'}
                </span>
              </span>
              <ChevronDown size={13} className={`topbar-caret ${userMenuOpen ? 'open' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="user-dropdown-menu">
                {/* User Info Header: Họ tên, Phòng ban, Vai trò */}
                <div className="user-dropdown-header">
                  <div className="user-dropdown-avatar-large">
                    {currentUser?.initials || initials}
                  </div>
                  <div className="user-dropdown-name">{currentUser?.name}</div>
                  <div className="user-dropdown-username">@{currentUser?.username}</div>
                  <div className="user-dropdown-dept">{currentUser?.department}</div>
                  <div className="user-dropdown-role">
                    {ROLE_LABELS[currentUser?.role] || currentUser?.role}
                  </div>
                </div>

                <div className="user-dropdown-divider" />

                {/* Dashboard or My Requests Shortcut */}
                {currentUser?.role === ROLES.REQUESTER ? (
                  <button
                    type="button"
                    className="user-dropdown-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/my-requests');
                    }}
                  >
                    <FileText size={15} color="var(--color-due-blue)" />
                    <span>Yêu cầu của tôi</span>
                  </button>
                ) : currentUser?.role === ROLES.STAFF ? (
                  <button
                    type="button"
                    className="user-dropdown-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/repair-plans');
                    }}
                  >
                    <FileText size={15} color="var(--color-due-blue)" />
                    <span>Phương án sửa chữa</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="user-dropdown-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/dashboard');
                    }}
                  >
                    <LayoutDashboard size={15} color="var(--color-due-blue)" />
                    <span>Bảng điều khiển tổng quan</span>
                  </button>
                )}

                <div className="user-dropdown-divider" />

                {/* Logout Button */}
                <button
                  type="button"
                  className="user-dropdown-item user-dropdown-logout"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main University Header (Matching Image 1: White header, University logo & title) */}
      <header className="app-header">
        <div className="header-left">
          {/* Toggle Sidebar Button */}
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title="Mở / Đóng thanh điều hướng"
            aria-label="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>

          {/* University Logo & Title (Matching Image 1) */}
          <Link
            to={
              currentUser?.role === ROLES.REQUESTER
                ? '/my-requests'
                : currentUser?.role === ROLES.STAFF
                  ? '/repair-plans'
                  : '/dashboard'
            }
            className="header-brand-link"
            title="Trường Đại học Kinh tế - ĐH Đà Nẵng"
          >
            <UniversityLogo variant="default" size="sm" showSubtitle={true} />
          </Link>

          {/* Breadcrumb Context */}
          <div className="header-breadcrumb-wrapper">
            <Breadcrumb />
          </div>
        </div>

        <div className="header-right">
          {/* Reset Demo Data Button */}
          <button
            type="button"
            className="btn-reset-demo"
            onClick={handleResetData}
            title="Khôi phục lại dữ liệu mẫu mặc định"
          >
            <RotateCcw size={13} />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>
        </div>
      </header>
    </>
  );
}
