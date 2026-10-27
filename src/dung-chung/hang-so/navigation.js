import {
  LayoutDashboard, FileText, ClipboardList, Wrench, ClipboardCheck,
  Building2, BarChart3, Settings, PlusCircle, List, ShieldCheck,
  Truck, CheckSquare
} from 'lucide-react';
import { ROLES } from './roles';

export const NAVIGATION = [
  {
    group: 'Tổng quan',
    items: [
      {
        key: 'dashboard',
        label: 'Bảng điều khiển',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: [ROLES.REQUESTER, ROLES.FACILITY_ADMIN, ROLES.STAFF, ROLES.DIRECTOR, ROLES.PROCUREMENT],
      },
    ],
  },
  {
    group: 'Yêu cầu sửa chữa',
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
      },
      {
        key: 'request-list',
        label: 'Danh sách yêu cầu',
        path: '/requests',
        icon: List,
        roles: [ROLES.FACILITY_ADMIN, ROLES.DIRECTOR],
      },
    ],
  },
  {
    group: 'Xử lý sửa chữa',
    items: [
      {
        key: 'repair-work',
        label: 'Công việc sửa chữa',
        path: '/repair-work',
        icon: Wrench,
        roles: [ROLES.STAFF],
      },
    ],
  },
  {
    group: 'Phương án & Phê duyệt',
    items: [
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
    ],
  },
  {
    group: 'Mua sắm & Thi công',
    items: [
      {
        key: 'external-work',
        label: 'Công việc thuê ngoài',
        path: '/external-work',
        icon: Truck,
        roles: [ROLES.PROCUREMENT],
      },
    ],
  },
  {
    group: 'Nghiệm thu',
    items: [
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
    group: 'Danh mục',
    items: [
      {
        key: 'facilities',
        label: 'Cơ sở vật chất',
        path: '/facilities',
        icon: Building2,
        roles: [ROLES.FACILITY_ADMIN, ROLES.REQUESTER, ROLES.STAFF, ROLES.PROCUREMENT],
      },
    ],
  },
  {
    group: 'Báo cáo',
    items: [
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

