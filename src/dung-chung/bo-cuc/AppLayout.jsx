import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../ung-dung/bo-cung-cap/AppContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import AiChatWidget from '../../tinh-nang/tro-ly-ai/thanh-phan/AiChatWidget';
import PageSkeleton from '../thanh-phan/PageSkeleton';
import '../styles/layout.css';

// Trang nào dùng bố cục skeleton nào trong lúc tải dữ liệu sau đăng nhập
function skeletonFor(pathname) {
  if (pathname === '/requests/create') return { variant: 'form' };
  if (/^\/requests\/[^/]+$/.test(pathname)) return { variant: 'detail' };
  if (pathname === '/dashboard' || pathname === '/reports') return { variant: 'dashboard' };
  if (pathname === '/approvals' || pathname === '/approval-results') return { variant: 'list', toolbar: 'tabs' };
  return { variant: 'list', toolbar: 'filters' };
}

// Các trang tự tải dữ liệu riêng, không cần chờ dữ liệu chung
const SELF_LOADING_PATHS = ['/ai-log'];

export default function AppLayout() {
  const { currentUser, dataStatus, dataError, retryDataLoad } = useApp();
  const { pathname } = useLocation();

  // Chuyển trang thì cuộn về đầu (nếu không, trang mới giữ vị trí cuộn cũ, VD đang ở chân trang đăng nhập)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted || !currentUser) {
        window.location.replace('/login');
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [currentUser]);

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
          {dataStatus === 'ready' || SELF_LOADING_PATHS.includes(pathname) ? (
            <div className="page-ready" key={pathname}>
              <Outlet />
            </div>
          ) : (
            <PageSkeleton
              {...skeletonFor(pathname)}
              error={dataStatus === 'error' ? dataError : ''}
              onRetry={retryDataLoad}
            />
          )}
        </main>
        <Footer />
      </div>

      <AiChatWidget />

    </div>
  );
}
