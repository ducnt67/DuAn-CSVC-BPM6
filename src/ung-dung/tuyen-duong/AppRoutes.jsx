import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../../dung-chung/bo-cuc/AppLayout';

import LoginPage from '../../tinh-nang/xac-thuc/trang/LoginPage';
import DashboardPage from '../../tinh-nang/bang-dieu-khien/trang/DashboardPage';
import MyRequestsPage from '../../tinh-nang/yeu-cau-sua-chua/trang/MyRequestsPage';
import RequestListPage from '../../tinh-nang/yeu-cau-sua-chua/trang/RequestListPage';
import RequestCreatePage from '../../tinh-nang/yeu-cau-sua-chua/trang/RequestCreatePage';
import RequestDetailPage from '../../tinh-nang/yeu-cau-sua-chua/trang/RequestDetailPage';
import FacilityListPage from '../../tinh-nang/co-so-vat-chat/trang/FacilityListPage';
import RepairWorkPage from '../../tinh-nang/xu-ly-sua-chua/trang/RepairWorkPage';
import RepairPlanPage from '../../tinh-nang/phuong-an-sua-chua/trang/RepairPlanPage';
import ApprovalListPage from '../../tinh-nang/phe-duyet/trang/ApprovalListPage';
import ExternalWorkPage from '../../tinh-nang/thue-ngoai/trang/ExternalWorkPage';
import AcceptancePage from '../../tinh-nang/nghiem-thu/trang/AcceptancePage';
import ReportsPage from '../../tinh-nang/bao-cao/trang/ReportsPage';
import NotFoundPage from './NotFoundPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Main App Layout */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my-requests" element={<MyRequestsPage />} />
        <Route path="requests" element={<RequestListPage />} />
        <Route path="requests/create" element={<RequestCreatePage />} />
        <Route path="requests/:id" element={<RequestDetailPage />} />
        <Route path="facilities" element={<FacilityListPage />} />
        <Route path="repair-work" element={<RepairWorkPage />} />
        <Route path="repair-plans" element={<RepairPlanPage />} />
        <Route path="approvals" element={<ApprovalListPage />} />
        <Route path="external-work" element={<ExternalWorkPage />} />
        <Route path="acceptance" element={<AcceptancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}


