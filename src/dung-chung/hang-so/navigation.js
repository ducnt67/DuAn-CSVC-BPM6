import {
  LayoutDashboard, FileText, ClipboardList, Wrench,
  Building2, BarChart3, PlusCircle, List, ShieldCheck,
  Truck, CheckSquare
} from 'lucide-react';
import { ROLES } from './roles';

export const NAVIGATION = [
  {
    group: 'Tổng quan',
    hideHeader: true,
    items: [
      {
        key: 'dashboard',
        label: 'Tổng quan',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: [ROLES.STAFF, ROLES.DIRECTOR, ROLES.PROCUREMENT],
      },
    ],
  },
  {
    group: 'Quản lý yêu cầu',
    items: [
      {
        key: 'my-requests',
        label: 'Yêu cầu của tôi',
        path: '/my-requests',
        icon: FileText,
        roles: [ROLES.REQUESTER],
      },
      {
        key: 'create-request',
        label: 'Tạo yêu cầu',
        path: '/requests/create',
        icon: PlusCircle,
        roles: [ROLES.REQUESTER],
        isSubItem: true,
      },
      {
        key: 'request-list',
        label: 'Danh sách yêu cầu',
        path: '/requests',
        icon: List,
        roles: [ROLES.FACILITY_ADMIN, ROLES.DIRECTOR],
      },
      {
        key: 'approval-results',
        label: 'Kết quả phê duyệt BGH',
        path: '/approval-results',
        icon: ShieldCheck,
        roles: [ROLES.FACILITY_ADMIN],
      },
    ],
  },
  {
    group: 'Quy trình sửa chữa',
    items: [
      {
        key: 'repair-work',
        label: 'Công việc sửa chữa',
        path: '/repair-work',
        icon: Wrench,
        roles: [ROLES.STAFF],
      },
      {
        key: 'repair-plans',
        label: 'Phương án sửa chữa',
        path: '/repair-plans',
        icon: ClipboardList,
        roles: [ROLES.STAFF],
      },
      {
        key: 'approvals',
        label: 'Phê duyệt phương án',
        path: '/approvals',
        icon: ShieldCheck,
        roles: [ROLES.DIRECTOR],
      },
      {
        key: 'external-work',
        label: 'Công việc thuê ngoài',
        path: '/external-work',
        icon: Truck,
        roles: [ROLES.PROCUREMENT],
      },
      {
        key: 'acceptance',
        label: 'Nghiệm thu',
        path: '/acceptance',
        icon: CheckSquare,
        roles: [ROLES.STAFF],
      },
    ],
  },
  {
    group: 'Dữ liệu & báo cáo',
    items: [
      {
        key: 'facilities',
        label: 'Cơ sở vật chất',
        path: '/facilities',
        icon: Building2,
        roles: [ROLES.STAFF, ROLES.PROCUREMENT],
      },
      {
        key: 'reports',
        label: 'Báo cáo & Thống kê',
        path: '/reports',
        icon: BarChart3,
        roles: [ROLES.FACILITY_ADMIN, ROLES.DIRECTOR],
      },
    ],
  },
];

