import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import { NAVIGATION } from '../hang-so/navigation';
import { ROLE_LABELS } from '../hang-so/roles';
import { REQUEST_STATUS } from '../hang-so/statuses';
import {
  ChevronDown, X, Phone, Mail,
  Sliders, Shield, UserCheck, ChevronRight
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ isOpen, isCollapsed = false, onClose }) {
  const { currentUser, requests } = useApp();
  const userRole = currentUser?.role;

  // Filter navigation groups and items by user role
  const visibleGroups = useMemo(() => {
    return NAVIGATION.map((group) => {
      const visibleItems = group.items.filter(
        (item) => !userRole || (item.roles && item.roles.includes(userRole))
      );
      return { ...group, items: visibleItems };
    }).filter((group) => group.items.length > 0);
  }, [userRole]);

  // Accordion state: by default, all visible groups are expanded
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Compute live badges for pending action items
  const itemBadges = useMemo(() => {
    if (!requests) return {};

    const badges = {};

    // 1. New requests for Admin
    const newCount = requests.filter(r => r.status === REQUEST_STATUS.NEW).length;
    if (newCount > 0) badges['request-list'] = { count: newCount, type: 'warning' };

    // 2. My active requests for Requester
    if (currentUser?.id) {
      const myActive = requests.filter(
        r => r.requesterId === currentUser.id && r.status !== REQUEST_STATUS.COMPLETED
      ).length;
      if (myActive > 0) badges['my-requests'] = { count: myActive, type: 'info' };
    }

    // 3. Technical work for Staff
    const workCount = requests.filter(
      r => [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.SURVEYING, REQUEST_STATUS.INTERNAL_REPAIR].includes(r.status)
    ).length;
    if (workCount > 0) badges['repair-work'] = { count: workCount, type: 'warning' };

    // 4. Pending approvals for Director
    const approvalCount = requests.filter(
      r => r.status === REQUEST_STATUS.WAITING_FOR_APPROVAL
    ).length;
    if (approvalCount > 0) badges['approvals'] = { count: approvalCount, type: 'danger' };

    // 5. External work for Procurement
    const extCount = requests.filter(
      r => [REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK, REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS, REQUEST_STATUS.NEEDS_REMEDIATION].includes(r.status)
    ).length;
    if (extCount > 0) badges['external-work'] = { count: extCount, type: 'warning' };

    // 6. Acceptance for Staff
    const acceptCount = requests.filter(
      r => [REQUEST_STATUS.WAITING_FOR_ACCEPTANCE, REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE, REQUEST_STATUS.OVERDUE_REMEDIATION, REQUEST_STATUS.NEEDS_REMEDIATION].includes(r.status)
    ).length;
    if (acceptCount > 0) badges['acceptance'] = { count: acceptCount, type: 'success' };

    return badges;
  }, [requests, currentUser]);

  const initials = currentUser?.name
    ? currentUser.name
      .split(' ')
      .map((n) => n[0])
      .slice(-2)
      .join('')
    : 'DUE';

  return (
    <>
      {/* Backdrop for Mobile */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Navigation Groups Container */}
        <nav className="sidebar-nav-container">
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Đóng thanh điều hướng"
          >
            <X size={16} />
          </button>

          {visibleGroups.map((group) => {
            const showGroupHeader = !group.hideHeader && group.items.length > 1;
            const isGroupCollapsed = showGroupHeader && Boolean(collapsedGroups[group.group]);

            return (
              <div key={group.group} className="sidebar-nav-group">
                {/* Group Heading Header */}
                {showGroupHeader && (
                  <button
                    type="button"
                    className="sidebar-group-header-btn"
                    onClick={() => toggleGroup(group.group)}
                    aria-expanded={!isGroupCollapsed}
                  >
                    <span className="sidebar-group-title">{group.group}</span>
                    <span className={`sidebar-group-chevron ${isGroupCollapsed ? 'is-collapsed' : ''}`}>
                      <ChevronDown size={13} />
                    </span>
                  </button>
                )}

                {/* Group Submenu Items */}
                {!isGroupCollapsed && (
                  <div className="sidebar-group-menu">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const badge = itemBadges[item.key];

                      return (
                        <NavLink
                          key={item.key}
                          to={item.path}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `sidebar-item-link ${isActive ? 'active' : ''}`
                          }
                          title={item.label}
                        >
                          <span className="sidebar-item-icon-box">
                            <Icon size={17} />
                          </span>
                          <span className="sidebar-item-label">{item.label}</span>

                          {/* Dynamic Action Badge */}
                          {badge && (
                            <span className={`sidebar-item-badge badge-${badge.type}`}>
                              {badge.count}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User & Support Profile Box */}
        <div className="sidebar-footer-box">
          {currentUser && (
            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar">
                {currentUser?.initials || initials}
              </div>
              <div className="sidebar-user-meta">
                <div className="sidebar-user-name" title={currentUser.name}>
                  {currentUser.name}
                </div>
                <div className="sidebar-user-role-badge">
                  {ROLE_LABELS[currentUser.role] || currentUser.role}
                </div>
              </div>
            </div>
          )}

          <div className="sidebar-support-line">
            <Phone size={12} color="#1677C8" />
            <span>Hotline: <strong>(84.236) 3525656</strong></span>
          </div>
        </div>
      </aside>
    </>
  );
}
