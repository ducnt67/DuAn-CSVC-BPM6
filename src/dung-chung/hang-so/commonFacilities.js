import {
  AirVent,
  Projector,
  Fan,
  Car,
  Lightbulb,
  Zap,
  Mic,
  Armchair,
  DoorClosed,
  Droplets,
  Wifi,
  Package,
} from 'lucide-react';

/**
 * Danh mục cơ sở vật chất / thiết bị chung chung dành cho người yêu cầu (Sinh viên / Giảng viên)
 * Không ghi quá chi tiết mã thiết bị hay cấu hình kỹ thuật phức tạp.
 */
export const COMMON_FACILITIES = [
  {
    id: 'dieu-hoa',
    name: 'Máy điều hòa',
    shortName: 'Điều hòa',
    icon: AirVent,
    color: '#0284c7', // Sky Blue
    bgColor: '#e0f2fe',
    description: 'Không lạnh, rò rỉ nước, không lên điện, kêu to',
    commonIssues: [
      'Điều hòa không mát / không lạnh',
      'Máy rò rỉ nước nhỏ giọt xuống sàn',
      'Máy không lên nguồn / không nhận điều khiển',
      'Phát ra tiếng ồn lớn hoặc mùi khét',
    ],
  },
  {
    id: 'may-chieu',
    name: 'Máy chiếu / Màn chiếu',
    shortName: 'Máy chiếu',
    icon: Projector,
    color: '#7c3aed', // Purple
    bgColor: '#f3e8ff',
    description: 'Không lên nguồn, nhòe màu, hỏng cáp HDMI/VGA',
    commonIssues: [
      'Máy chiếu không lên nguồn / đèn báo đỏ',
      'Màn hình nhòe màu / sọc / mờ',
      'Hỏng cáp kết nối HDMI / VGA',
      'Màn chiếu bị kẹt không cuốn lên/xuống được',
    ],
  },
  {
    id: 'quat',
    name: 'Quạt điện (Trần / Treo)',
    shortName: 'Quạt điện',
    icon: Fan,
    color: '#0d9488', // Teal
    bgColor: '#ccfbf1',
    description: 'Quạt trần rung lắc, quạt treo không quay, đứt dây',
    commonIssues: [
      'Quạt trần rung lắc mạnh / kêu tiếng rít bất thường',
      'Quạt không quay / quay rất yếu',
      'Hỏng hộp số điều khiển / đứt dây giật số',
      'Có mùi khét cơ học',
    ],
  },
  {
    id: 'o-to',
    name: 'Ô tô / Xe đưa đón công tác',
    shortName: 'Ô tô',
    icon: Car,
    color: '#ea580c', // Orange
    bgColor: '#ffedd5',
    description: 'Yêu cầu xe đưa đón, sự cố kỹ thuật xe công tác',
    commonIssues: [
      'Yêu cầu xe đưa đón giảng dạy / công tác ngoại khóa',
      'Điều hòa trên xe không hoạt động',
      'Xe gặp trục trặc kỹ thuật / cần bảo dưỡng',
      'Hỗ trợ phương tiện vận chuyển đột xuất',
    ],
  },
  {
    id: 'den-chieu-sang',
    name: 'Đèn / Điện chiếu sáng',
    shortName: 'Đèn chiếu sáng',
    icon: Lightbulb,
    color: '#d97706', // Amber
    bgColor: '#fef3c7',
    description: 'Cháy bóng, chập chờn, hỏng công tắc',
    commonIssues: [
      'Bóng đèn bị cháy / không sáng',
      'Đèn chập chờn nhấp nháy liên tục',
      'Hỏng công tắc bật tắt / chập điện',
      'Đèn chiếu bảng phòng học bị tắt',
    ],
  },
  {
    id: 'o-cam-dien',
    name: 'Ổ cắm điện / Nguồn điện',
    shortName: 'Ổ cắm điện',
    icon: Zap,
    color: '#dc2626', // Red
    bgColor: '#fee2e2',
    description: 'Mất điện, ổ cắm lỏng lẻo, chập cháy',
    commonIssues: [
      'Ổ cắm bàn giảng viên không có điện',
      'Ổ cắm lỏng lẻo không giữ được phích cắm',
      'Có vết cháy đen / bốc mùi khét',
      'Aptomat phòng bị nhảy liên tục',
    ],
  },
  {
    id: 'am-thanh',
    name: 'Âm thanh / Micro / Loa',
    shortName: 'Âm thanh',
    icon: Mic,
    color: '#2563eb', // Blue
    bgColor: '#dbeafe',
    description: 'Micro mất tiếng, loa rè, hú rít',
    commonIssues: [
      'Micro không bắt tiếng / hết pin / hỏng',
      'Loa giảng đường bị rè / mất tiếng một bên',
      'Amply không lên nguồn',
      'Tiếng hú rít không điều chỉnh được',
    ],
  },
  {
    id: 'ban-ghe',
    name: 'Bàn ghế / Bục giảng / Bảng',
    shortName: 'Bàn ghế',
    icon: Armchair,
    color: '#475569', // Slate
    bgColor: '#f1f5f9',
    description: 'Gãy chân, bong mặt bàn, xước bảng',
    commonIssues: [
      'Bàn ghế sinh viên bị gãy chân / lung lay',
      'Mặt bàn bong tróc / đinh ốc nhô lên',
      'Bục giảng ọp ẹp / mối mọt',
      'Bảng viết bị mờ / khó lau chùi',
    ],
  },
  {
    id: 'cua-khoa',
    name: 'Cửa / Bản lề / Khóa phòng',
    shortName: 'Cửa & Khóa',
    icon: DoorClosed,
    color: '#059669', // Green
    bgColor: '#d1fae5',
    description: 'Kẹt cửa, hỏng ổ khóa, gãy bản lề',
    commonIssues: [
      'Cửa phòng học bị kẹt không đóng/mở được',
      'Ổ khóa bị hỏng / kẹt chìa',
      'Bản lề bị rỉ sét / cong vênh',
      'Kính cửa sổ nứt vỡ nguy hiểm',
    ],
  },
  {
    id: 'nuoc-ve-sinh',
    name: 'Nước / Thiết bị vệ sinh',
    shortName: 'Nước & Vệ sinh',
    icon: Droplets,
    color: '#0891b2', // Cyan
    bgColor: '#cffafe',
    description: 'Rò rỉ vòi nước, nghẹt lavabo, mất nước',
    commonIssues: [
      'Vòi nước lavabo bị rò rỉ liên tục',
      'Bồn rửa tay / thoát sàn bị nghẹt ứ nước',
      'Hỏng van xả nước bồn cầu',
      'Khu vệ sinh bị mất nước',
    ],
  },
  {
    id: 'mang-internet',
    name: 'Mạng Internet / Wifi',
    shortName: 'Mạng Wifi',
    icon: Wifi,
    color: '#4f46e5', // Indigo
    bgColor: '#e0e7ff',
    description: 'Mất sóng Wifi, mạng chập chờn, hỏng cổng LAN',
    commonIssues: [
      'Mất kết nối Internet phòng học / làm việc',
      'Sóng Wifi yếu không đăng nhập được',
      'Đầu cáp mạng LAN bị gãy lẫy',
    ],
  },
  {
    id: 'khac',
    name: 'Cơ sở vật chất khác',
    shortName: 'Khác',
    icon: Package,
    color: '#64748b',
    bgColor: '#f8fafc',
    description: 'Thấm dột trần, thiết bị phòng lab, sự cố khác',
    commonIssues: [
      'Trần nhà bị thấm dột nước khi trời mưa',
      'Sự cố thiết bị phòng thí nghiệm / thực hành',
      'Vấn đề cơ sở vật chất khác (mô tả chi tiết)',
    ],
  },
];

/**
 * Danh sách các tòa nhà / khu của trường:
 * Hiện tại trường có các khu: A, C, D, E, F, G, H
 */
export const CAMPUS_BUILDINGS = [
  { id: 'A', code: 'Khu A', name: 'Giảng đường Khu A', desc: 'Khu giảng đường' },
  { id: 'C', code: 'Khu C', name: 'Giảng đường Khu C', desc: 'Khu giảng đường' },
  { id: 'D', code: 'Khu D', name: 'Giảng đường Khu D', desc: 'Khu giảng đường' },
  { id: 'E', code: 'Khu E', name: 'Giảng đường Khu E', desc: 'Khu giảng đường' },
  { id: 'G', code: 'Khu G', name: 'Giảng đường Khu G', desc: 'Khu giảng đường' },
  { id: 'F', code: 'Khu F', name: 'Khu Hiệu bộ (Tòa F)', desc: 'Khu hiệu bộ' },
  { id: 'H', code: 'Khu H', name: 'Tòa nhà Đa năng (Tòa H)', desc: 'Tòa nhà đa năng' },
];

export const BUILDING_CODES = CAMPUS_BUILDINGS.map(b => b.code);

/**
 * Loại đối tượng người yêu cầu
 */
export const REQUESTER_TYPES = [
  { id: 'LECTURER', label: 'Giảng viên / Cán bộ nhân viên' },
  { id: 'STUDENT', label: 'Sinh viên / Học viên' },
];
