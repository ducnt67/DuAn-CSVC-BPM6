import { useState, useMemo } from 'react';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS, STATUS_LABELS, REPAIR_TYPE_LABELS } from '../../../dung-chung/hang-so/statuses';
import { PRIORITY_LABELS } from '../../../dung-chung/hang-so/priorities';
import { Download, BarChart3, TrendingUp, DollarSign, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import Button from '../../../dung-chung/thanh-phan/Button';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import { formatCurrency } from '../../../dung-chung/tien-ich/formatCurrency';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function ReportsPage() {
  const { requests, facilities, addToast } = useApp();

  const [buildingFilter, setBuildingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Extract buildings
  const buildings = useMemo(() => {
    return Array.from(new Set(facilities.map((f) => f.building))).filter(Boolean);
  }, [facilities]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (buildingFilter && r.building !== buildingFilter) return false;
      if (typeFilter && r.repairType !== typeFilter) return false;
      return true;
    });
  }, [requests, buildingFilter, typeFilter]);

  // Calculated Statistics
  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const completed = filteredRequests.filter((r) => r.status === REQUEST_STATUS.COMPLETED).length;
    const inProgress = filteredRequests.filter((r) => [
      REQUEST_STATUS.ACCEPTED,
      REQUEST_STATUS.SURVEYING,
      REQUEST_STATUS.WAITING_FOR_PLAN,
      REQUEST_STATUS.INTERNAL_REPAIR,
      REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS,
    ].includes(r.status)).length;
    const remediation = filteredRequests.filter((r) => r.status === REQUEST_STATUS.NEEDS_REMEDIATION).length;

    // Total cost
    const totalCost = filteredRequests.reduce((sum, r) => sum + (Number(r.estimatedCost) || 0), 0);

    return { total, completed, inProgress, remediation, totalCost };
  }, [filteredRequests]);

  // Status breakdown chart data
  const statusChartData = useMemo(() => {
    const statusCounts = {};
    filteredRequests.forEach((r) => {
      const label = STATUS_LABELS[r.status] || r.status;
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, count]) => ({ name, count }));
  }, [filteredRequests]);

  // Repair Type chart data
  const repairTypeChartData = useMemo(() => {
    const internal = filteredRequests.filter((r) => r.repairType === 'INTERNAL').length;
    const external = filteredRequests.filter((r) => r.repairType === 'EXTERNAL').length;
    const unassigned = filteredRequests.filter((r) => !r.repairType).length;
    return [
      { name: 'Nội bộ', value: internal, color: '#1677C8' },
      { name: 'Thuê ngoài', value: external, color: '#F58220' },
      { name: 'Chưa phân loại', value: unassigned, color: '#8E99A8' },
    ].filter((d) => d.value > 0);
  }, [filteredRequests]);

  // Cost by Building
  const costByBuildingData = useMemo(() => {
    const costMap = {};
    filteredRequests.forEach((r) => {
      const b = r.building || 'Khác';
      costMap[b] = (costMap[b] || 0) + (Number(r.estimatedCost) || 0);
    });
    return Object.entries(costMap).map(([building, cost]) => ({
      building,
      cost,
    }));
  }, [filteredRequests]);

  // Real CSV Export Function
  const handleExportCSV = () => {
    if (filteredRequests.length === 0) {
      addToast('Không có dữ liệu để xuất file', 'warning');
      return;
    }

    const headers = [
      'Mã Yêu Cầu',
      'Mô Tả Sự Cố',
      'Cơ Sở Vật Chất',
      'Tòa Nhà',
      'Phòng',
      'Người Yêu Cầu',
      'Đơn Vị',
      'Mức Độ Ưu Tiên',
      'Hình Thức Sửa Chữa',
      'Cán Bộ Phụ Trách',
      'Trạng Thái',
      'Chi Phí Dự Toán (VND)',
      'Ngày Tạo',
    ];

    const rows = filteredRequests.map((r) => [
      `"${r.id}"`,
      `"${(r.description || r.title || '').replace(/"/g, '""')}"`,
      `"${(r.facilityName || '').replace(/"/g, '""')}"`,
      `"${r.building || ''}"`,
      `"${r.location || ''}"`,
      `"${r.requesterName || ''}"`,
      `"${r.department || ''}"`,
      `"${PRIORITY_LABELS[r.priority] || r.priority || ''}"`,
      `"${REPAIR_TYPE_LABELS[r.repairType] || r.repairType || 'Chưa xác định'}"`,
      `"${r.assignedStaffName || 'Chưa phân công'}"`,
      `"${STATUS_LABELS[r.status] || r.status}"`,
      r.estimatedCost || 0,
      `"${formatDate(r.createdAt)}"`,
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Microsoft Excel
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DUE_Bao_Cao_Sua_Chua_CSVC_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast('Đã tải xuống file báo cáo CSV thành công!', 'success');
  };

  return (
    <div>
      <PageHeader
        title="Báo cáo & Thống kê cơ sở vật chất"
        description="Tổng hợp số liệu khối lượng công việc, kinh phí sửa chữa và hiệu quả vận hành cơ sở vật chất DUE"
        actions={
          <Button variant="primary" icon={Download} onClick={handleExportCSV}>
            Xuất dữ liệu CSV
          </Button>
        }
      />

      <FilterBar
        onReset={() => { setBuildingFilter(''); setTypeFilter(''); }}
        hasActiveFilters={Boolean(buildingFilter || typeFilter)}
      >
        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="form-control"
          style={{ width: 180 }}
        >
          <option value="">-- Tất cả tòa nhà --</option>
          {buildings.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-control"
          style={{ width: 190 }}
        >
          <option value="">-- Tất cả hình thức --</option>
          <option value="INTERNAL">Sửa chữa nội bộ</option>
          <option value="EXTERNAL">Thuê ngoài</option>
        </select>
      </FilterBar>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={statCardStyle}>
          <span style={statLabelStyle}>Tổng số yêu cầu</span>
          <div style={statNumberStyle}>{stats.total}</div>
          <span style={statFooterStyle}>Theo bộ lọc hiện tại</span>
        </div>

        <div style={statCardStyle}>
          <span style={statLabelStyle}>Đã hoàn thành</span>
          <div style={{ ...statNumberStyle, color: 'var(--color-green)' }}>{stats.completed}</div>
          <span style={statFooterStyle}>Tỷ lệ: {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
        </div>

        <div style={statCardStyle}>
          <span style={statLabelStyle}>Đang xử lý</span>
          <div style={{ ...statNumberStyle, color: 'var(--color-blue)' }}>{stats.inProgress}</div>
          <span style={statFooterStyle}>Khảo sát, duyệt & thi công</span>
        </div>

        <div style={statCardStyle}>
          <span style={statLabelStyle}>Cần khắc phục</span>
          <div style={{ ...statNumberStyle, color: 'var(--color-danger)' }}>{stats.remediation}</div>
          <span style={statFooterStyle}>Nghiệm thu chưa đạt</span>
        </div>

        <div style={statCardStyle}>
          <span style={statLabelStyle}>Tổng kinh phí dự toán</span>
          <div style={{ ...statNumberStyle, fontSize: '1.35rem', color: 'var(--color-primary)' }}>
            {formatCurrency(stats.totalCost)}
          </div>
          <span style={statFooterStyle}>Bao gồm nội bộ & thuê ngoài</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Status Breakdown */}
        <div style={chartCardStyle}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>
            Phân bổ số lượng yêu cầu theo trạng thái
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#1677C8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost by Building */}
        <div style={chartCardStyle}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 16 }}>
            Kinh phí sửa chữa theo tòa nhà (VND)
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={costByBuildingData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="building" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val / 1000000}M`} />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Kinh phí']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="cost" fill="#F58220" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 20,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 14 }}>
          Bảng kê chi tiết yêu cầu sửa chữa ({filteredRequests.length} bản ghi)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <th style={{ padding: '8px 10px' }}>Mã YC</th>
                <th style={{ padding: '8px 10px' }}>Mô tả sự cố</th>
                <th style={{ padding: '8px 10px' }}>Tòa nhà</th>
                <th style={{ padding: '8px 10px' }}>Hình thức</th>
                <th style={{ padding: '8px 10px' }}>Kinh phí (VND)</th>
                <th style={{ padding: '8px 10px' }}>Trạng thái</th>
                <th style={{ padding: '8px 10px' }}>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: 'var(--color-blue)' }}>{r.id}</td>
                  <td style={{ padding: '10px', fontWeight: 500, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.description || r.title}
                  </td>
                  <td style={{ padding: '10px' }}>{r.building}</td>
                  <td style={{ padding: '10px' }}>{REPAIR_TYPE_LABELS[r.repairType] || '—'}</td>
                  <td style={{ padding: '10px', fontWeight: 600 }}>{formatCurrency(r.estimatedCost || 0)}</td>
                  <td style={{ padding: '10px' }}>{STATUS_LABELS[r.status]}</td>
                  <td style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
  gap: 6,
};

const statLabelStyle = {
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
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

const chartCardStyle = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  padding: 20,
  boxShadow: 'var(--shadow-sm)',
};

