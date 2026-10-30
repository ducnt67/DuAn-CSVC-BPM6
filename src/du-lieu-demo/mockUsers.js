import { ROLES } from '../dung-chung/hang-so/roles';

export const MOCK_USERS = [
  {
    id: 'U01',
    username: 'nmanh',
    password: '123',
    name: 'Nguyễn Minh Anh',
    role: ROLES.REQUESTER,
    roleTitle: 'Giảng viên',
    userType: 'LECTURER',
    userTypeLabel: 'Cán bộ / Giảng viên',
    department: 'Khoa Quản trị Kinh doanh',
    email: 'nmanh@due.edu.vn',
    phone: '0901234567',
    avatar: null,
    initials: 'MA',
    roleDescription: 'Cán bộ / Giảng viên báo hỏng cơ sở vật chất, theo dõi tiến độ và xác nhận hoàn thành',
  },
  {
    id: 'U02',
    username: 'tqhuy',
    password: '123',
    name: 'Trần Quốc Huy',
    role: ROLES.FACILITY_ADMIN,
    roleTitle: 'Quản trị CSVC',
    userType: 'LECTURER',
    userTypeLabel: 'Quản trị CSVC',
    department: 'Phòng Quản trị Cơ sở vật chất',
    email: 'tqhuy@due.edu.vn',
    phone: '0902345678',
    avatar: null,
    initials: 'QH',
    roleDescription: 'Tiếp nhận yêu cầu, phân công cán bộ kỹ thuật, lập phương án và quản lý danh mục CSVC',
  },
  {
    id: 'U03',
    username: 'lhnam',
    password: '123',
    name: 'Lê Hoàng Nam',
    role: ROLES.STAFF,
    roleTitle: 'Cán bộ phụ trách',
    userType: 'LECTURER',
    userTypeLabel: 'Cán bộ kỹ thuật CSVC',
    department: 'Tổ Kỹ thuật Cơ sở vật chất',
    email: 'lhnam@due.edu.vn',
    phone: '0903456789',
    avatar: null,
    initials: 'HN',
    roleDescription: 'Khảo sát hiện trạng, thực hiện sửa chữa nội bộ, nghiệm thu thuê ngoài',
  },
  {
    id: 'U04',
    username: 'nttha',
    password: '123',
    name: 'Nguyễn Thị Thu Hà',
    role: ROLES.DIRECTOR,
    roleTitle: 'Ban Giám hiệu',
    userType: 'LECTURER',
    userTypeLabel: 'Ban Giám hiệu',
    department: 'Ban Giám hiệu Trường',
    email: 'nttha@due.edu.vn',
    phone: '0904567890',
    avatar: null,
    initials: 'TH',
    roleDescription: 'Xem xét và phê duyệt / từ chối phương án sửa chữa và dự toán kinh phí',
  },
  {
    id: 'U05',
    username: 'pvbinh',
    password: '123',
    name: 'Phạm Văn Bình',
    role: ROLES.PROCUREMENT,
    roleTitle: 'BP Đầu tư & Mua sắm',
    userType: 'LECTURER',
    userTypeLabel: 'BP Đầu tư, Mua sắm & XD',
    department: 'Bộ phận Đầu tư, Mua sắm & Xây dựng',
    email: 'pvbinh@due.edu.vn',
    phone: '0905678901',
    avatar: null,
    initials: 'VB',
    roleDescription: 'Quản lý hồ sơ công việc thuê ngoài, đơn vị thi công và tiến độ thực hiện',
  },
  {
    id: 'U06',
    username: 'sv_hoang',
    password: '123',
    name: 'Trần Minh Hoàng',
    role: ROLES.REQUESTER,
    roleTitle: 'Sinh viên',
    userType: 'STUDENT',
    userTypeLabel: 'Sinh viên / Học viên',
    department: 'Lớp 47K01.1 - Khoa QTKD',
    email: 'hoang.tm@due.edu.vn',
    phone: '0912345678',
    avatar: null,
    initials: 'MH',
    roleDescription: 'Sinh viên báo hỏng cơ sở vật chất phòng học, giảng đường và theo dõi xử lý',
  },
];

export function getUserById(id) {
  return MOCK_USERS.find(u => u.id === id);
}

export function getUserByUsername(username) {
  return MOCK_USERS.find(
    u => u.username.toLowerCase() === username.trim().toLowerCase() ||
         u.email.toLowerCase() === username.trim().toLowerCase()
  );
}

export function getUsersByRole(role) {
  return MOCK_USERS.filter(u => u.role === role);
}
