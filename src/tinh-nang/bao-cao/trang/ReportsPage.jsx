import { useState, useMemo } from 'react';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS, STATUS_LABELS, REPAIR_TYPE_LABELS } from '../../../dung-chung/hang-so/statuses';
import { PRIORITY, PRIORITY_LABELS } from '../../../dung-chung/hang-so/priorities';
import { CAMPUS_BUILDINGS } from '../../../dung-chung/hang-so/commonFacilities';
import {
  Download, Building2, BarChart3, TrendingUp, DollarSign,
  CheckCircle2, Clock, AlertTriangle, ShieldAlert, Wrench,
  Layers, Check, Filter
} from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import Button from '../../../dung-chung/thanh-phan/Button';
import FilterBar from '../../../dung-chung/thanh-phan/FilterBar';
import { formatCurrency } from '../../../dung-chung/tien-ich/formatCurrency';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';

/**
 * Chuẩn hóa tên tòa nhà về danh sách chuẩn Khu A, C, D, E, F, G, H như bên người yêu cầu
 */
function normalizeBuildingCode(raw) {
  if (!raw) return 'Khu A';
  const str = String(raw).trim().toUpperCase();
  if (str.includes('KHU A') || str.includes('TÒA NHÀ A') || str.includes('TÒA A') || str.startsWith('A')) return 'Khu A';
  if (str.includes('KHU C') || str.includes('TÒA NHÀ C') || str.includes('TÒA C') || str.startsWith('C')) return 'Khu C';
  if (str.includes('KHU D') || str.includes('TÒA NHÀ D') || str.includes('TÒA D') || str.startsWith('D')) return 'Khu D';
  if (str.includes('KHU E') || str.includes('TÒA NHÀ E') || str.includes('TÒA E') || str.includes('KHU B') || str.includes('TÒA B') || str.startsWith('E') || str.startsWith('B')) return 'Khu E';
  if (str.includes('KHU F') || str.includes('TÒA NHÀ F') || str.includes('TÒA F') || str.startsWith('F')) return 'Khu F';
  if (str.includes('KHU G') || str.includes('TÒA NHÀ G') || str.includes('TÒA G') || str.startsWith('G')) return 'Khu G';
  if (str.includes('KHU H') || str.includes('TÒA NHÀ H') || str.includes('TÒA H') || str.startsWith('H')) return 'Khu H';
  return 'Khu A';
}

/**
 * Lấy kinh phí thực tế của yêu cầu (từ r.estimatedCost, r.surveyData hoặc repairPlans)
 */
function getRequestCost(r, repairPlans) {
  if (r.estimatedCost && Number(r.estimatedCost) > 0) return Number(r.estimatedCost);
  if (r.surveyData?.estimatedCost && Number(r.surveyData.estimatedCost) > 0) return Number(r.surveyData.estimatedCost);
  const plan = repairPlans?.find((p) => p.requestId === r.id);
  if (plan?.estimatedCost && Number(plan.estimatedCost) > 0) return Number(plan.estimatedCost);
  return 0;
}

/**
 * Lấy hình thức sửa chữa (Nội bộ vs Thuê ngoài)
 */
function getRequestRepairType(r, repairPlans) {
  if (r.repairType) return r.repairType;
  const plan = repairPlans?.find((p) => p.requestId === r.id);
  if (plan?.repairType) return plan.repairType;
  if (r.surveyData?.recommendation?.toLowerCase().includes('thuê') || r.surveyData?.recommendation?.toLowerCase().includes('chuyên môn')) {
    return 'EXTERNAL';
  }
  return 'INTERNAL';
}

export default function ReportsPage() {
  const { requests, repairPlans, addToast } = useApp();

  const [buildingFilter, setBuildingFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Chuẩn hóa và làm giàu dữ liệu các yêu cầu
  const enrichedRequests = useMemo(() => {
    return requests.map((r) => {
      const buildingCode = normalizeBuildingCode(r.building);
      const cost = getRequestCost(r, repairPlans);
      const repairType = getRequestRepairType(r, repairPlans);
      return {
        ...r,
        buildingCode,
        actualCost: cost,
        actualRepairType: repairType,
      };
    });
  }, [requests, repairPlans]);

  // Danh sách tòa nhà chuẩn từ bên người yêu cầu (Khu A, C, D, E, F, G, H)
  const campusBuildingList = CAMPUS_BUILDINGS;

  // Lọc dữ liệu theo bộ lọc
  const filteredRequests = useMemo(() => {
    return enrichedRequests.filter((r) => {
      if (buildingFilter && r.buildingCode !== buildingFilter) return false;
      if (typeFilter && r.actualRepairType !== typeFilter) return false;
      if (priorityFilter && r.priority !== priorityFilter) return false;
      return true;
    });
  }, [enrichedRequests, buildingFilter, typeFilter, priorityFilter]);

  // Các chỉ số KPI tổng hợp có ý nghĩa
  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const completed = filteredRequests.filter((r) => r.status === REQUEST_STATUS.COMPLETED).length;
    const inProgress = filteredRequests.filter((r) => [
      REQUEST_STATUS.ACCEPTED,
      REQUEST_STATUS.SURVEYING,
      REQUEST_STATUS.WAITING_FOR_PLAN,
      REQUEST_STATUS.INTERNAL_REPAIR,
      REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS,
      REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK,
      REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
      REQUEST_STATUS.WAITING_FOR_CONFIRMATION,
    ].includes(r.status)).length;

    const remediation = filteredRequests.filter((r) => [
      REQUEST_STATUS.NEEDS_REMEDIATION,
      REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE,
      REQUEST_STATUS.OVERDUE_REMEDIATION,
    ].includes(r.status)).length;

    const totalCost = filteredRequests.reduce((sum, r) => sum + r.actualCost, 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, remediation, totalCost, completionRate };
  }, [filteredRequests]);

  // 1. Dữ liệu biểu đồ: Số lượng sự cố theo từng Khu / Tòa nhà (Khu A, C, D, E, F, G, H)
  const buildingIncidentsData = useMemo(() => {
    return campusBuildingList.map((b) => {
      const inBuilding = filteredRequests.filter((r) => r.buildingCode === b.code);
      const completed = inBuilding.filter((r) => r.status === REQUEST_STATUS.COMPLETED).length;
      const inProgress = inBuilding.filter((r) => r.status !== REQUEST_STATUS.COMPLETED && r.status !== REQUEST_STATUS.CANCELLED).length;
      return {
        building: b.code,
        name: b.name,
        total: inBuilding.length,
        completed,
        inProgress,
      };
    });
  }, [filteredRequests, campusBuildingList]);

  // 2. Dữ liệu biểu đồ: Kinh phí sửa chữa theo từng Khu / Tòa nhà (Khu A, C, D, E, F, G, H)
  const costByBuildingData = useMemo(() => {
    return campusBuildingList.map((b) => {
      const inBuilding = filteredRequests.filter((r) => r.buildingCode === b.code);
      const cost = inBuilding.reduce((sum, r) => sum + r.actualCost, 0);
      return {
        building: b.code,
        name: b.name,
        cost,
      };
    });
  }, [filteredRequests, campusBuildingList]);

  // 3. Dữ liệu biểu đồ: Cơ cấu hình thức sửa chữa (Nội bộ vs Thuê ngoài)
  const repairTypeData = useMemo(() => {
    const internalReqs = filteredRequests.filter((r) => r.actualRepairType === 'INTERNAL');
    const externalReqs = filteredRequests.filter((r) => r.actualRepairType === 'EXTERNAL');

    const internalCount = internalReqs.length;
    const externalCount = externalReqs.length;

    const internalCost = internalReqs.reduce((sum, r) => sum + r.actualCost, 0);
    const externalCost = externalReqs.reduce((sum, r) => sum + r.actualCost, 0);

    return [
      { name: 'Sửa chữa nội bộ', value: internalCount, cost: internalCost, color: '#1677C8' },
      { name: 'Thuê ngoài', value: externalCount, cost: externalCost, color: '#F58220' },
    ].filter((d) => d.value > 0);
  }, [filteredRequests]);

  // 4. Dữ liệu biểu đồ: Mức độ ưu tiên
  const priorityData = useMemo(() => {
    const urgent = filteredRequests.filter((r) => r.priority === PRIORITY.URGENT || r.priority === PRIORITY.HIGH).length;
    const medium = filteredRequests.filter((r) => r.priority === PRIORITY.MEDIUM).length;
    const low = filteredRequests.filter((r) => r.priority === PRIORITY.LOW).length;

    return [
      { name: 'Khẩn cấp', count: urgent, color: '#DC2626' },
      { name: 'Xử lý sớm', count: medium, color: '#D97706' },
      { name: 'Xử lý sau', count: low, color: '#2563EB' },
    ];
  }, [filteredRequests]);

  // Bảng tổng hợp báo cáo chỉ số theo Khu / Tòa nhà
  const buildingSummaryRows = useMemo(() => {
    return campusBuildingList.map((b) => {
      const inBuilding = filteredRequests.filter((r) => r.buildingCode === b.code);
      const total = inBuilding.length;
      const completed = inBuilding.filter((r) => r.status === REQUEST_STATUS.COMPLETED).length;
      const inProgress = inBuilding.filter((r) => [
        REQUEST_STATUS.ACCEPTED,
        REQUEST_STATUS.SURVEYING,
        REQUEST_STATUS.WAITING_FOR_PLAN,
        REQUEST_STATUS.INTERNAL_REPAIR,
        REQUEST_STATUS.EXTERNAL_WORK_IN_PROGRESS,
        REQUEST_STATUS.WAITING_FOR_EXTERNAL_WORK,
        REQUEST_STATUS.WAITING_FOR_ACCEPTANCE,
        REQUEST_STATUS.WAITING_FOR_CONFIRMATION,
      ].includes(r.status)).length;
      const remediation = inBuilding.filter((r) => [
        REQUEST_STATUS.NEEDS_REMEDIATION,
        REQUEST_STATUS.WAITING_REMEDIATION_RESPONSE,
        REQUEST_STATUS.OVERDUE_REMEDIATION,
      ].includes(r.status)).length;
      const cost = inBuilding.reduce((sum, r) => sum + r.actualCost, 0);
      const rate = total > 0 ? Math.round((completed / total) * 100) : 100;

      return {
        code: b.code,
        name: b.name,
        desc: b.desc,
        total,
        completed,
        inProgress,
        remediation,
        cost,
        rate,
      };
    });
  }, [filteredRequests, campusBuildingList]);

  // Xuất file CSV báo cáo tổng hợp theo tòa nhà
  const handleExportCSV = () => {
    if (buildingSummaryRows.length === 0) {
      addToast('Không có dữ liệu để xuất file', 'warning');
      return;
    }

    const headers = [
      'Khu Vực / Tòa Nhà',
      'Tên Tòa Nhà',
      'Chức Năng',
      'Tổng Sự Cố Tiếp Nhận',
      'Đã Xử Lý Xong',
      'Đang Xử Lý',
      'Cần Khắc Phục (72h)',
      'Tỷ Lệ Giải Quyết (%)',
      'Tổng Kinh Phí (VND)',
    ];

    const rows = buildingSummaryRows.map((b) => [
      `"${b.code}"`,
      `"${b.name}"`,
      `"${b.desc}"`,
      b.total,
      b.completed,
      b.inProgress,
      b.remediation,
      `"${b.rate}%"`,
      b.cost,
    ]);

    // Tổng cộng
    rows.push([
      '"TỔNG CỘNG TOÀN TRƯỜNG"',
      '""',
      '""',
      stats.total,
      stats.completed,
      stats.inProgress,
      stats.remediation,
      `"${stats.completionRate}%"`,
      stats.totalCost,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DUE_Bao_Cao_Tong_Hop_Khu_Vuc_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToast('Đã tải xuống file báo cáo tổng hợp thành công!', 'success');
  };

  return (
    <div>
      <PageHeader
        title="Báo cáo & Thống kê cơ sở vật chất"
        description="Tổng hợp số liệu khối lượng công việc, kinh phí sửa chữa và hiệu suất vận hành cơ sở vật chất theo các khu A, C, D, E, F, G, H"
        actions={
          <Button variant="primary" icon={Download} onClick={handleExportCSV}>
            Xuất báo cáo tổng hợp (CSV)
          </Button>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        onReset={() => {
          setBuildingFilter('');
          setTypeFilter('');
          setPriorityFilter('');
        }}
        hasActiveFilters={Boolean(buildingFilter || typeFilter || priorityFilter)}
      >
        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="form-control"
          style={{ width: 190 }}
        >
          <option value="">-- Tất cả tòa nhà --</option>
          {campusBuildingList.map((b) => (
            <option key={b.code} value={b.code}>
              {b.code} - {b.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-control"
          style={{ width: 180 }}
        >
          <option value="">-- Tất cả hình thức --</option>
          <option value="INTERNAL">Sửa chữa nội bộ</option>
          <option value="EXTERNAL">Thuê ngoài</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="form-control"
          style={{ width: 180 }}
        >
          <option value="">-- Mức độ ưu tiên --</option>
          <option value={PRIORITY.URGENT}>Khẩn cấp</option>
          <option value={PRIORITY.HIGH}>Xử lý sớm (Cao)</option>
          <option value={PRIORITY.MEDIUM}>Trung bình</option>
          <option value={PRIORITY.LOW}>Xử lý sau (Thấp)</option>
        </select>
      </FilterBar>

      {/* Meaningful KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={statLabelStyle}>Tổng sự cố tiếp nhận</span>
            <span style={{ color: 'var(--color-due-blue)' }}><Layers size={18} /></span>
          </div>
          <div style={statNumberStyle}>{stats.total}</div>
          <span style={statFooterStyle}>Toàn trường các khu A, C, D, E, F, G, H</span>
        </div>

        <div style={{ ...statCardStyle, borderColor: '#B0E0C8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...statLabelStyle, color: '#15803D' }}>Đã xử lý hoàn thành</span>
            <span style={{ color: '#229A58' }}><CheckCircle2 size={18} /></span>
          </div>
          <div style={{ ...statNumberStyle, color: 'var(--color-green)' }}>{stats.completed}</div>
          <span style={{ ...statFooterStyle, color: '#15803D', fontWeight: 600 }}>
            Tỷ lệ giải quyết: {stats.completionRate}%
          </span>
        </div>

        <div style={{ ...statCardStyle, borderColor: '#B8D9F5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...statLabelStyle, color: '#0F63A8' }}>Đang triển khai xử lý</span>
            <span style={{ color: '#1677C8' }}><Clock size={18} /></span>
          </div>
          <div style={{ ...statNumberStyle, color: 'var(--color-blue)' }}>{stats.inProgress}</div>
          <span style={statFooterStyle}>Đang khảo sát, duyệt hoặc thi công</span>
        </div>

        <div style={{ ...statCardStyle, borderColor: '#F5B8B8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...statLabelStyle, color: '#B91C1C' }}>Cần khắc phục (72h)</span>
            <span style={{ color: '#D64545' }}><AlertTriangle size={18} /></span>
          </div>
          <div style={{ ...statNumberStyle, color: 'var(--color-danger)' }}>{stats.remediation}</div>
          <span style={statFooterStyle}>Nghiệm thu chưa đạt, yêu cầu bảo hành</span>
        </div>

        <div style={{ ...statCardStyle, borderColor: '#FED7AA' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...statLabelStyle, color: '#C2410C' }}>Tổng kinh phí sửa chữa</span>
            <span style={{ color: 'var(--color-primary)' }}><DollarSign size={18} /></span>
          </div>
          <div style={{ ...statNumberStyle, fontSize: '1.35rem', color: 'var(--color-primary)' }}>
            {formatCurrency(stats.totalCost)}
          </div>
          <span style={statFooterStyle}>Kinh phí dự toán & duyệt thực tế</span>
        </div>
      </div>

      {/* Row 1 Charts: Incidents & Costs by Campus Buildings (A, C, D, E, F, G, H) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Chart 1: Incidents by Building */}
        <div style={chartCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Số lượng sự cố theo từng Khu / Tòa nhà
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '3px 0 0 0' }}>
                So sánh số sự cố phát sinh vs đã hoàn thành tại các khu A, C, D, E, F, G, H
              </p>
            </div>
            <span style={{ color: 'var(--color-due-blue)' }}><Building2 size={18} /></span>
          </div>

          <div style={{ width: '100%', height: 270 }}>
            <ResponsiveContainer>
              <BarChart data={buildingIncidentsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="building" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val, name) => [val, name === 'total' ? 'Tổng sự cố' : name === 'completed' ? 'Đã hoàn thành' : 'Đang xử lý']}
                  labelFormatter={(code) => {
                    const found = campusBuildingList.find(b => b.code === code);
                    return found ? `${code} - ${found.name}` : code;
                  }}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }}
                />
                <Legend
                  formatter={(value) => value === 'total' ? 'Tổng sự cố phát sinh' : value === 'completed' ? 'Đã hoàn thành' : 'Đang xử lý'}
                  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                />
                <Bar dataKey="total" fill="#1677C8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#229A58" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Cost by Building */}
        <div style={chartCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Kinh phí sửa chữa theo từng Khu / Tòa nhà (VND)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '3px 0 0 0' }}>
                Tổng kinh phí sửa chữa thiết bị & cơ sở vật chất giải ngân theo khu
              </p>
            </div>
            <span style={{ color: 'var(--color-primary)' }}><DollarSign size={18} /></span>
          </div>

          <div style={{ width: '100%', height: 270 }}>
            <ResponsiveContainer>
              <BarChart data={costByBuildingData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="building" tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(0)}M` : `${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(val), 'Kinh phí']}
                  labelFormatter={(code) => {
                    const found = campusBuildingList.find(b => b.code === code);
                    return found ? `${code} - ${found.name}` : code;
                  }}
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="cost" fill="#F58220" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Repair Type & Priority Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Chart 3: Repair Type Distribution */}
        <div style={chartCardStyle}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14 }}>
            Cơ cấu hình thức sửa chữa & Kinh phí
          </h3>
          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={repairTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {repairTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val} yêu cầu (${formatCurrency(item.payload.cost)})`,
                    item.payload.name,
                  ]}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Priority Distribution */}
        <div style={chartCardStyle}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14 }}>
            Phân bố khối lượng công việc theo mức độ ưu tiên
          </h3>
          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-priority-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Meaningful Analytical Building Performance Summary Table (Replacing the redundant ticket table) */}
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 22,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Bảng tổng hợp chỉ số vận hành cơ sở vật chất theo Khu / Tòa nhà
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
              Báo cáo giám sát tỷ lệ giải quyết sự cố và tổng chi phí sửa chữa theo từng tòa nhà phục vụ đào tạo
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
            Cập nhật theo dữ liệu thực tế
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--color-border)',
                  backgroundColor: '#F8FAFC',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '12px 14px' }}>Khu vực / Tòa nhà</th>
                <th style={{ padding: '12px 14px' }}>Chức năng</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Tổng sự cố</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Đã hoàn thành</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Đang xử lý</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Cần khắc phục</th>
                <th style={{ padding: '12px 14px' }}>Tỷ lệ giải quyết</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Tổng kinh phí</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Đánh giá vận hành</th>
              </tr>
            </thead>
            <tbody>
              {buildingSummaryRows.map((row) => (
                <tr
                  key={row.code}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-blue)' }}>
                    {row.code}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                    {row.name} ({row.desc})
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                    {row.total}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', color: '#16A34A', fontWeight: 700 }}>
                    {row.completed}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', color: '#2563EB', fontWeight: 600 }}>
                    {row.inProgress}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', color: row.remediation > 0 ? '#DC2626' : 'var(--color-text-tertiary)', fontWeight: row.remediation > 0 ? 700 : 400 }}>
                    {row.remediation}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#E2E8F0',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${row.rate}%`,
                            height: '100%',
                            backgroundColor: row.rate >= 80 ? '#16A34A' : row.rate >= 50 ? '#D97706' : '#DC2626',
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 35 }}>
                        {row.rate}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatCurrency(row.cost)}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {row.total === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>Chưa có sự cố</span>
                    ) : row.rate >= 80 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 4,
                          backgroundColor: '#E9F8EF',
                          color: '#229A58',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Check size={12} strokeWidth={3} /> Vận hành tốt
                      </span>
                    ) : row.rate >= 50 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 4,
                          backgroundColor: '#FFF1E5',
                          color: '#D97B0D',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Clock size={12} /> Đang xử lý
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 4,
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <AlertTriangle size={12} /> Cần tập trung
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  borderTop: '2px solid var(--color-border)',
                  backgroundColor: '#F1F5F9',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                }}
              >
                <td style={{ padding: '12px 14px', color: 'var(--color-text)' }}>
                  TỔNG CỘNG
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  Toàn bộ 7 khu A, C, D, E, F, G, H
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  {stats.total}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#16A34A' }}>
                  {stats.completed}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: '#2563EB' }}>
                  {stats.inProgress}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', color: stats.remediation > 0 ? '#DC2626' : 'inherit' }}>
                  {stats.remediation}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ color: '#15803D' }}>{stats.completionRate}% TB</span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                  {formatCurrency(stats.totalCost)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Giám sát liên tục</span>
                </td>
              </tr>
            </tfoot>
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
  lineHeight: 1.1,
};

const statFooterStyle = {
  fontSize: '0.75rem',
  color: 'var(--color-text-tertiary)',
  marginTop: 2,
};

const chartCardStyle = {
  backgroundColor: 'var(--color-white)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--color-border)',
  padding: 20,
  boxShadow: 'var(--shadow-sm)',
};
