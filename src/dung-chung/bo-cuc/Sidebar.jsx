import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import { NAVIGATION } from '../hang-so/navigation';
import { ChevronDown, X, Phone, Mail } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ isOpen, isCollapsed = false, onClose }) {
  const { currentUser } = useApp();
  const userRole = currentUser?.role;

  // Filter navigation groups and items by user role
  const visibleGroups = NAVIGATION.map((group) => {
    const visibleItems = group.items.filter(
      (item) => !userRole || (item.roles && item.roles.includes(userRole))
    );
    return { ...group, items: visibleItems };
  }).filter((group) => group.items.length > 0);

  // Accordion state: by default, all visible groups are expanded
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-box">
          <Link to="/dashboard" className="brand-wrapper" onClick={onClose}>
            <div className="brand-emblem">
              <img src="/logo_app.svg" alt="Logo DUE Facility Management" className="brand-logo" />
            </div>
            <div className="brand-info">
              <span className="brand-subtext">ĐẠI HỌC ĐÀ NẴNG</span>
              <span className="brand-maintext">TRƯỜNG ĐH KINH TẾ</span>
              <span className="brand-tag">QUẢN LÝ CSVC</span>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onClose}
            aria-label="Đóng menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Groups Accordion (Matches user's reference screenshot) */}
        <nav className="sidebar-nav-container">
          {visibleGroups.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.group]);

            return (
              <div key={group.group} className="sidebar-accordion-group">
                <button
                  type="button"
                  className="sidebar-group-btn"
                  onClick={() => toggleGroup(group.group)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="sidebar-group-left">
                    <span>▾</span>
                    <span>{group.group}</span>
                  </span>
                  <span className={`sidebar-group-arrow ${isCollapsed ? 'is-collapsed' : ''}`}>
                    <ChevronDown size={14} />
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="sidebar-group-children">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.key}
                          to={item.path}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `sidebar-item-link ${isActive ? 'active' : ''}`
                          }
                        >
                          <span className="item-bullet" />
                          <Icon size={15} className="item-icon" />
                          <span className="sidebar-item-text">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer with university IT contact info */}
        <div className="sidebar-footer-box">
          <div className="footer-support-title">HỖ TRỢ KỸ THUẬT CSVC</div>
          <div className="footer-support-line">
            <Phone size={13} color="#0054a6" />
            <span>088.888.888</span>
          </div>
          <div className="footer-support-line">
            <Mail size={13} color="#0054a6" />
            <span>ufm@due.edu.vn</span>
          </div>
        </div>
      </aside>
    </>
  );
}

