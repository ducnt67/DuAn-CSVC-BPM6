import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import Toast from '../thanh-phan/Toast';
import '../styles/layout.css';

export default function AppLayout() {
  const { currentUser } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // If no user is logged in, redirect to login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 992) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="app-layout">
      <Header onToggleSidebar={handleToggleSidebar} />

      <Sidebar
        isOpen={mobileOpen}
        isCollapsed={desktopCollapsed}
        onClose={() => setMobileOpen(false)}
      />

      <div className={`main-wrapper ${desktopCollapsed ? 'sidebar-collapsed' : ''}`}>
        <main className="main-content">
          <Outlet />
        </main>
        <Footer />
      </div>

      <Toast />
    </div>
  );
}
