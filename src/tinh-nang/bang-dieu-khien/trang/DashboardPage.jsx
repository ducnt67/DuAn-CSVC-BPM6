import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS } from '../../../dung-chung/hang-so/statuses';
import { PRIORITY } from '../../../dung-chung/hang-so/priorities';
import { ROLES } from '../../../dung-chung/hang-so/roles';
import { ArrowRight, PlusCircle, ShieldCheck } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DashboardStats from '../thanh-phan/DashboardStats';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import Button from '../../../dung-chung/thanh-phan/Button';
import PortalShortcuts from '../../../dung-chung/thanh-phan/PortalShortcuts';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
  const { requests, currentUser } = useApp();
  const navigate = useNavigate();

  // Calculate live statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const newReqs = requests.filter((r) => r.status === REQUEST_STATUS.NEW).length;
    const inProgress = requests.filter((r) => [
      REQUEST_STATUS.ACCEPTED,
      REQUEST_STATUS.SURVEYING,
      REQUEST_STATUS.WAITING_FOR_PLAN,
      REQUEST_STATUS.INTERNAL_REPAIR,
      REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS,
      REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK,
    ].includes(r.status)).length;
    const pendingApproval = requests.filter((r) => r.status === REQUEST_STATUS.WAITING_FOR_APPROVAL).length;
    const waitingReview = requests.filter((r) => [
      REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
      REQUEST_STATUS.WAITING_FOR_CONFIRMATION,
    ].includes(r.status)).length;
    const needsRemediation = requests.filter((r) => [REQUEST_STATUS.NEEDS_REMEDIATION, REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE, REQUEST_STATUS.OVERDUE_REMEDIATION].includes(r.status)).length;
    const completed = requests.filter((r) => r.status === REQUEST_STATUS.COMPLETED).length;

    return { total, newReqs, inProgress, pendingApproval, waitingReview, needsRemediation, completed };
  }, [requests]);

  // Chart data: Repair Type
  const repairTypeData = useMemo(() => {
    const internal = requests.filter((r) => r.repairType === 'INTERNAL').length;
    const external = requests.filter((r) => r.repairType === 'EXTERNAL').length;
    const unassigned = requests.filter((r) => !r.repairType).length;
    return [
      { name: 'Sửa chữa nội bộ', value: internal, color: '#1677C8' },
      { name: 'Thuê ngoài', value: external, color: '#F58220' },
      { name: 'Chưa xác định', value: unassigned, color: '#8E99A8' },
    ].filter((d) => d.value > 0);
  }, [requests]);

  // Chart data: Priorities
  const priorityData = useMemo(() => {
    return [
      { name: 'Thấp', count: requests.filter((r) => r.priority === PRIORITY.LOW).length },
      { name: 'Trung bình', count: requests.filter((r) => r.priority === PRIORITY.MEDIUM).length },
      { name: 'Cao', count: requests.filter((r) => r.priority === PRIORITY.HIGH).length },
      { name: 'Khẩn cấp', count: requests.filter((r) => r.priority === PRIORITY.URGENT).length },
    ];
  }, [requests]);

  // Role-specific recent requests filter
  const relevantRequests = useMemo(() => {
    if (!currentUser) return requests.slice(0, 5);
    if (currentUser.role === ROLES.REQUESTER) {
      return requests.filter((r) => r.requesterId === currentUser.id).slice(0, 6);
    }
    if (currentUser.role === ROLES.STAFF) {
      return requests.filter((r) => r.assignedStaffId === currentUser.id).slice(0, 6);
    }
    return requests.slice(0, 6);
  }, [requests, currentUser]);

  return (
    <div>
      <PageHeader
        title="Bảng điều khiển tổng quan"
        description="Theo dõi trạng thái, tiến độ và khối lượng công việc quản lý cơ sở vật chất"
        actions={
          currentUser?.role === ROLES.REQUESTER ? (
            <Button
              variant="primary"
              icon={PlusCircle}
              onClick={() => navigate('/requests/create')}
            >
              Tạo yêu cầu mới
            </Button>
          ) : currentUser?.role === ROLES.DIRECTOR ? (
            <Button
              variant="outline"
              icon={ShieldCheck}
              onClick={() => navigate('/approvals')}
            >
              Xem phương án chờ duyệt ({stats.pendingApproval})
            </Button>
          ) : null
        }
      />

      <DashboardStats stats={stats} />

      {/* Charts Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Priorities Bar Chart */}
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
            Phân bố theo mức độ ưu tiên
          </h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #E4E9F0',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#1677C8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Repair Type Pie Chart */}
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
            Cơ cấu hình thức sửa chữa
          </h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={repairTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {repairTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #E4E9F0',
                    fontSize: 12,
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Relevant Requests Table */}
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 20,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
              {currentUser?.role === ROLES.REQUESTER
                ? 'Yêu cầu của bạn gần đây'
                : currentUser?.role === ROLES.STAFF
                ? 'Yêu cầu được phân công cho bạn'
                : 'Yêu cầu sửa chữa gần đây'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
              Nhấp vào một dòng để xem chi tiết tiến độ và thực hiện thao tác
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(currentUser?.role === ROLES.REQUESTER ? '/my-requests' : '/requests')
            }
          >
            Xem tất cả <ArrowRight size={14} />
          </Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Mã YC</th>
                <th style={{ padding: '10px 12px' }}>Tiêu đề</th>
                <th style={{ padding: '10px 12px' }}>Cơ sở vật chất</th>
                <th style={{ padding: '10px 12px' }}>Ưu tiên</th>
                <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                <th style={{ padding: '10px 12px' }}>Ngày tạo</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {relevantRequests.map((req) => (
                <tr
                  key={req.id}
                  style={{ borderBottom: '1px solid var(--color-border-light)', cursor: 'pointer' }}
                  onClick={() => navigate(`/requests/${req.id}`)}
                >
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-blue)' }}>
                    {req.id}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 500, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.title}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>
                    {req.facilityName} ({req.location})
                  </td>
                  <td style={{ padding: '12px' }}>
                    <PriorityBadge priority={req.priority} />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <StatusBadge status={req.status} />
                  </td>
                  <td style={{ padding: '12px', color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    {formatDate(req.createdAt)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/requests/${req.id}`);
                      }}
                    >
                      Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Navigation Cards matching Image 2 */}
      <PortalShortcuts />
    </div>
  );
}

const statCardStyle = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  padding: 18,
  boxShadow: 'var(--shadow-sm)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const statLabelStyle = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
};

const iconBadgeStyle = {
  width: 32,
  height: 32,
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const statNumberStyle = {
  fontSize: '1.75rem',
  fontWeight: 700,
  color: 'var(--color-text)',
  lineHeight: 1,
};

const statFooterStyle = {
  fontSize: '0.75rem',
  color: 'var(--color-text-tertiary)',
};


