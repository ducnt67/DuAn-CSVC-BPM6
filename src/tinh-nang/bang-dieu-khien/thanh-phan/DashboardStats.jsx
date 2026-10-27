import {
  AlertTriangle,
  CheckCircle,
  CheckSquare,
  Clock,
  FileText,
  Layers,
} from 'lucide-react';

const cards = [
  { key: 'total', label: 'Tổng yêu cầu', footer: 'Toàn trường', icon: Layers, bg: '#EAF4FF', color: '#1677C8' },
  { key: 'newReqs', label: 'Yêu cầu mới', footer: 'Cần tiếp nhận & phân công', icon: FileText, bg: '#FFF1E5', color: '#F58220' },
  { key: 'inProgress', label: 'Đang xử lý', footer: 'Khảo sát & sửa chữa', icon: Clock, bg: '#EAF4FF', color: '#1677C8' },
  { key: 'waitingReview', label: 'Chờ nghiệm thu / XN', footer: 'Nghiệm thu hoặc xác nhận', icon: CheckSquare, bg: '#FFF7DF', color: '#D99A16' },
  { key: 'needsRemediation', label: 'Cần khắc phục', footer: 'Nghiệm thu không đạt', icon: AlertTriangle, bg: '#FFF0F0', color: '#D64545' },
  { key: 'completed', label: 'Đã hoàn thành', footer: 'Nghiệm thu & đóng hồ sơ', icon: CheckCircle, bg: '#E9F8EF', color: '#229A58' },
];

export default function DashboardStats({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
      {cards.map(({ key, label, footer, icon: Icon, bg, color }) => (
        <div key={key} className="stat-card" style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={statLabelStyle}>{label}</span>
            <div style={{ ...iconBadgeStyle, backgroundColor: bg, color }}><Icon size={18} /></div>
          </div>
          <div style={statNumberStyle}>{stats[key]}</div>
          <div style={statFooterStyle}>{footer}</div>
        </div>
      ))}
    </div>
  );
}

const statCardStyle = {
  backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)', padding: 18,
  boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 8,
};

const statLabelStyle = { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' };
const iconBadgeStyle = { width: 32, height: 32, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const statNumberStyle = { fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 };
const statFooterStyle = { fontSize: '0.75rem', color: 'var(--color-text-tertiary)' };
