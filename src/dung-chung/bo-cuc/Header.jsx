import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, LogOut, Phone, Mail, MessageSquare, RotateCcw,
  ChevronDown, UserCheck, LayoutDashboard
} from 'lucide-react';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import { ROLE_LABELS } from '../hang-so/roles';
import Breadcrumb from './Breadcrumb';
import NotificationPanel from './NotificationPanel';
import './Header.css';

export default function Header({ onToggleSidebar }) {
  const { currentUser, logout, resetDemoData } = useApp();
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
    navigate('/login');
  };

  const initials = currentUser?.name
    ? currentUser.name
      .split(' ')
      .map((n) => n[0])
      .slice(-2)
      .join('')
    : 'ND';

  return (
    <>
      {/* Top Utility Bar (Navy Blue matching DUE E-Study LMS screenshot) */}
      <div className="app-topbar">
        <div className="topbar-left">
          <a href="tel:02363525656" className="topbar-contact-item">
            <Phone size={13} />
            <span>Điện thoại: 088.888.888</span>
          </a>
          <a href="mailto:ufm@due.edu.vn" className="topbar-contact-item">
            <Mail size={13} />
            <span>E-mail: ufm@due.edu.vn</span>
          </a>
        </div>

        <div className="topbar-right">
          {/* Notifications Panel */}
          <div style={{ position: 'relative' }}>
            <NotificationPanel />
          </div>

          {/* Messages */}
          <button
            type="button"
            className="topbar-icon-btn"
            title="Tin nhắn hệ thống"
            aria-label="Tin nhắn"
          >
            <MessageSquare size={15} />
          </button>

          {/* User Avatar with Dropdown (Matching Screenshot 2) */}
          <div className="topbar-user-menu-container" ref={userMenuRef}>
            <button
              type="button"
              className="topbar-user-trigger"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              title="Thông tin tài khoản"
            >
              <div className="topbar-user-avatar">
                {currentUser?.initials || initials}
              </div>
              <ChevronDown size={13} className={`topbar-caret ${userMenuOpen ? 'open' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="user-dropdown-menu">
                {/* User Info Header: Họ tên, Phòng ban / Lớp học, Vai trò */}
                <div className="user-dropdown-header">
                  <div className="user-dropdown-name">{currentUser?.name}</div>
                  <div className="user-dropdown-dept">{currentUser?.department}</div>
                  <div className="user-dropdown-role">
                    {ROLE_LABELS[currentUser?.role] || currentUser?.role}
                  </div>
                </div>

                <div className="user-dropdown-divider" />

                {/* Dashboard Shortcut */}
                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/dashboard');
                  }}
                >
                  <LayoutDashboard size={15} color="#0054a6" />
                  <span>Bảng điều khiển</span>
                </button>

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
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Header (Clean & Minimal) */}
      <header className="app-header">
        <div className="header-left">
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title="Mở / Đóng thanh điều hướng"
            aria-label="Toggle Sidebar"
          >
            <Menu size={18} />
          </button>
          <Breadcrumb />
        </div>

        <div className="header-right">
          <Link to="/dashboard" className="header-nav-link">
            Trang chủ
          </Link>
          <Link to="/requests" className="header-nav-link">
            Quản lý CSVC
          </Link>

          {/* Reset Demo Data Button */}
          <button
            type="button"
            className="btn-reset-demo"
            onClick={resetDemoData}
            title="Khôi phục lại dữ liệu mẫu"
          >
            <RotateCcw size={13} />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>
        </div>
      </header>
    </>
  );
}

