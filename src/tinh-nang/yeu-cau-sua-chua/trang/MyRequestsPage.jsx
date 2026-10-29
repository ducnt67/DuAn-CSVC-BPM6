import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS } from '../../../dung-chung/hang-so/statuses';
import {
  COMMON_FACILITIES,
  CAMPUS_BUILDINGS,
} from '../../../dung-chung/hang-so/commonFacilities';
import {
  PlusCircle,
  Eye,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Grid,
  List,
  MapPin,
  Calendar,
  User,
  Wrench,
  Sparkles,
  ArrowRight,
  FileText,
  HelpCircle,
  X,
} from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import DataTable from '../../../dung-chung/thanh-phan/DataTable';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import Button from '../../../dung-chung/thanh-phan/Button';
import SearchInput from '../../../dung-chung/thanh-phan/SearchInput';
import Modal from '../../../dung-chung/thanh-phan/Modal';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import { formatDate } from '../../../dung-chung/tien-ich/formatDate';
import './MyRequestsPage.css';

// Helper to find matching common facility category by keyword
function resolveFacilityCategory(req) {
  if (req.facilityCategory) {
    const found = COMMON_FACILITIES.find((f) => f.id === req.facilityCategory);
    if (found) return found;
  }
  const text = `${req.title || ''} ${req.facilityName || ''} ${req.facilityType || ''}`.toLowerCase();
  if (text.includes('điều hòa') || text.includes('máy lạnh')) return COMMON_FACILITIES[0]; // dieu-hoa
  if (text.includes('chiếu')) return COMMON_FACILITIES[1]; // may-chieu
  if (text.includes('quạt')) return COMMON_FACILITIES[2]; // quat
  if (text.includes('ô tô') || text.includes('xe ')) return COMMON_FACILITIES[3]; // o-to
  if (text.includes('đèn') || text.includes('chiếu sáng')) return COMMON_FACILITIES[4]; // den-chieu-sang
  if (text.includes('ổ cắm') || text.includes('điện')) return COMMON_FACILITIES[5]; // o-cam-dien
  if (text.includes('micro') || text.includes('loa') || text.includes('âm thanh')) return COMMON_FACILITIES[6]; // am-thanh
  if (text.includes('bàn') || text.includes('ghế') || text.includes('bảng')) return COMMON_FACILITIES[7]; // ban-ghe
  if (text.includes('cửa') || text.includes('khóa') || text.includes('bản lề')) return COMMON_FACILITIES[8]; // cua-khoa
  if (text.includes('nước') || text.includes('vệ sinh') || text.includes('vòi') || text.includes('lavabo')) return COMMON_FACILITIES[9]; // nuoc-ve-sinh
  if (text.includes('mạng') || text.includes('wifi') || text.includes('internet') || text.includes('switch')) return COMMON_FACILITIES[10]; // mang-internet
  return COMMON_FACILITIES[11]; // khac
}


export default function MyRequestsPage() {
  const { requests, currentUser, updateRequest, addToast } = useApp();
  const navigate = useNavigate();

  // Filters state
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [statusGroupFilter, setStatusGroupFilter] = useState('ALL'); // 'ALL', 'IN_PROGRESS', 'ACTION_NEEDED', 'COMPLETED'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Modals state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmResult, setConfirmResult] = useState('PASS'); // 'PASS' or 'FAIL'
  const [confirmFeedback, setConfirmFeedback] = useState('');

  const [supplementModalOpen, setSupplementModalOpen] = useState(false);
  const [supplementText, setSupplementText] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);

  // Filter requests strictly for this requester
  const myAllRequests = useMemo(() => {
    return requests.filter((r) => {
      if (currentUser?.id && r.requesterId !== currentUser.id) return false;
      return true;
    });
  }, [requests, currentUser]);

  // Compute KPI counts
  const stats = useMemo(() => {
    const total = myAllRequests.length;
    const completed = myAllRequests.filter((r) => r.status === REQUEST_STATUS.COMPLETED).length;
    const actionNeeded = myAllRequests.filter((r) =>
      [REQUEST_STATUS.WAITING_FOR_CONFIRMATION, REQUEST_STATUS.NEEDS_INFORMATION].includes(r.status)
    ).length;
    const inProgress = total - completed - actionNeeded;

    return { total, completed, actionNeeded, inProgress };
  }, [myAllRequests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return myAllRequests.filter((r) => {
      // Keyword search
      if (search) {
        const q = search.toLowerCase();
        const matchId = r.id.toLowerCase().includes(q);
        const matchContent = ((r.description || '') + ' ' + (r.title || '')).toLowerCase().includes(q);
        const matchFac = (r.facilityName || '').toLowerCase().includes(q);
        const matchLoc = (r.location || '').toLowerCase().includes(q);
        if (!matchId && !matchContent && !matchFac && !matchLoc) return false;
      }

      // Building filter (Khu A, C, D, E, F, G, H)
      if (buildingFilter && r.building !== buildingFilter) {
        return false;
      }

      // Facility category filter
      if (facilityFilter) {
        const category = resolveFacilityCategory(r);
        if (category.id !== facilityFilter) return false;
      }

      // Status Group Filter
      if (statusGroupFilter === 'COMPLETED') {
        if (r.status !== REQUEST_STATUS.COMPLETED) return false;
      } else if (statusGroupFilter === 'ACTION_NEEDED') {
        if (![REQUEST_STATUS.WAITING_FOR_CONFIRMATION, REQUEST_STATUS.NEEDS_INFORMATION].includes(r.status)) {
          return false;
        }
      } else if (statusGroupFilter === 'IN_PROGRESS') {
        if (
          r.status === REQUEST_STATUS.COMPLETED ||
          [REQUEST_STATUS.WAITING_FOR_CONFIRMATION, REQUEST_STATUS.NEEDS_INFORMATION].includes(r.status)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [myAllRequests, search, buildingFilter, facilityFilter, statusGroupFilter]);

  // Handle Requester Confirmation (Satisfied or Not)
  const handleConfirmInternal = () => {
    if (!selectedRequest) return;

    if (confirmResult === 'PASS') {
      updateRequest(selectedRequest.id, {
        status: REQUEST_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        timeline: [
          ...(selectedRequest.timeline || []),
          {
            stage: 'Xác nhận hoàn thành',
            status: 'COMPLETED',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Người yêu cầu',
            note: `Người yêu cầu đã nghiệm thu & xác nhận hài lòng: "${confirmFeedback || 'Đã sửa chữa tốt, thiết bị hoạt động bình thường'}"`,
          },
        ],
        history: [
          ...(selectedRequest.history || []),
          {
            date: new Date().toISOString(),
            action: 'Xác nhận hoàn thành sửa chữa',
            actor: currentUser?.name || 'Người yêu cầu',
            detail: confirmFeedback || 'Đạt yêu cầu sử dụng tốt.',
          },
        ],
      });
      addToast(`Đã xác nhận hoàn thành sửa chữa cho yêu cầu ${selectedRequest.id}`, 'success');
    } else {
      if (!confirmFeedback.trim()) {
        addToast('Vui lòng nêu rõ lý do chưa đạt yêu cầu để kỹ thuật viên khắc phục', 'error');
        return;
      }
      updateRequest(selectedRequest.id, {
        status: REQUEST_STATUS.INTERNAL_REPAIR,
        timeline: [
          ...(selectedRequest.timeline || []),
          {
            stage: 'Phản hồi chưa đạt',
            status: 'IN_PROGRESS',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.name || 'Người yêu cầu',
            note: `Người yêu cầu phản hồi chưa đạt: ${confirmFeedback}`,
          },
        ],
        history: [
          ...(selectedRequest.history || []),
          {
            date: new Date().toISOString(),
            action: 'Phản hồi chưa đạt kết quả',
            actor: currentUser?.name || 'Người yêu cầu',
            detail: confirmFeedback,
          },
        ],
      });
      addToast(`Đã gửi phản hồi yêu cầu kỹ thuật viên kiểm tra lại cho ${selectedRequest.id}`, 'warning');
    }
    setConfirmModalOpen(false);
  };

  // Handle supplement info
  const handleSupplement = () => {
    if (!supplementText.trim()) {
      addToast('Vui lòng nhập nội dung thông tin bổ sung', 'error');
      return;
    }
    updateRequest(selectedRequest.id, {
      status: REQUEST_STATUS.ACCEPTED,
      timeline: [
        ...(selectedRequest.timeline || []),
        {
          stage: 'Bổ sung thông tin',
          status: 'COMPLETED',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.name || 'Người yêu cầu',
          note: `Đã bổ sung: ${supplementText}`,
        },
      ],
      history: [
        ...(selectedRequest.history || []),
        {
          date: new Date().toISOString(),
          action: 'Bổ sung thông tin yêu cầu',
          actor: currentUser?.name || 'Người yêu cầu',
          detail: supplementText,
        },
      ],
    });
    addToast(`Đã cập nhật bổ sung thông tin cho yêu cầu ${selectedRequest.id}`, 'success');
    setSupplementModalOpen(false);
  };

  // Table columns definition: 7 streamlined columns to prevent horizontal clipping
  // 1. Mã yêu cầu
  // 2. Tiêu đề sự cố
  // 3. Cán bộ kỹ thuật
  // 4. Trạng thái
  // 5. Ngày gửi
  // 6. Xác nhận
  // 7. Thao tác
  const columns = [
    {
      title: 'Mã YC',
      field: 'id',
      sortable: true,
      width: '105px',
      render: (val) => (
        <span style={{ fontWeight: 700, color: 'var(--color-due-blue)', fontSize: '0.875rem' }}>
          {val}
        </span>
      ),
    },
    {
      title: 'Mô tả sự cố',
      field: 'description',
      sortable: true,
      render: (val, row) => (
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--color-text)',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={val || row.title}
          >
            {val || row.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {row.building} • {row.location}
          </div>
        </div>
      ),
    },
    {
      title: 'Cán bộ kỹ thuật',
      field: 'assignedStaffName',
      width: '160px',
      render: (val) =>
        val ? (
          <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{val}</div>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>Đang chờ phân công</span>
        ),
    },
    {
      title: 'Trạng thái',
      field: 'status',
      sortable: true,
      width: '150px',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      title: 'Ngày gửi',
      field: 'createdAt',
      sortable: true,
      width: '115px',
      render: (val) => formatDate(val),
    },
    {
      title: 'Xác nhận',
      width: '135px',
      align: 'center',
      render: (_, row) => {
        const isWaitingConfirmation = row.status === REQUEST_STATUS.WAITING_FOR_CONFIRMATION;
        const isNeedsInfo = row.status === REQUEST_STATUS.NEEDS_INFORMATION;
        const isCompleted = row.status === REQUEST_STATUS.COMPLETED;

        if (isWaitingConfirmation) {
          return (
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRequest(row);
                setConfirmResult('PASS');
                setConfirmFeedback('');
                setConfirmModalOpen(true);
              }}
            >
              Xác nhận
            </Button>
          );
        }

        if (isNeedsInfo) {
          return (
            <Button
              variant="warning"
              size="sm"
              icon={MessageSquare}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRequest(row);
                setSupplementText('');
                setSupplementModalOpen(true);
              }}
            >
              Bổ sung
            </Button>
          );
        }

        if (isCompleted) {
          return (
            <span
              style={{
                color: '#16A34A',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ✓ Đã hoàn tất
            </span>
          );
        }

        return <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>—</span>;
      },
    },
    {
      title: 'Thao tác',
      width: '105px',
      align: 'center',
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/requests/${row.id}`);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="my-requests-container">
      {/* 1. Welcome & Greeting Banner */}
      <div className="my-requests-welcome-card">
        <div>
          <div className="welcome-info-title">
            Xin chào, {currentUser?.name || 'Giảng viên / Sinh viên'}!
            <span className="welcome-role-tag">Người yêu cầu</span>
          </div>
          <div className="welcome-info-desc">
            Cổng tiếp nhận báo hỏng và theo dõi sửa chữa cơ sở vật chất (máy chiếu, điều hòa, quạt, ô tô, điện nước...) của Trường Đại học Kinh tế - ĐH Đà Nẵng.
          </div>
        </div>

        <button
          type="button"
          className="btn-create-banner"
          onClick={() => navigate('/requests/create')}
        >
          <PlusCircle size={20} />
          <span>Báo hỏng / Gửi yêu cầu mới</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="my-requests-stats-grid">
        <div
          className={`stat-metric-card ${statusGroupFilter === 'ALL' ? 'active-filter' : ''}`}
          onClick={() => setStatusGroupFilter('ALL')}
        >
          <div className="stat-metric-info">
            <span className="stat-metric-label">Tổng số yêu cầu của tôi</span>
            <span className="stat-metric-number">{stats.total}</span>
          </div>
          <div className="stat-metric-icon-box" style={{ backgroundColor: '#e8f3fc', color: '#1677C8' }}>
            <FileText size={22} />
          </div>
        </div>

        <div
          className={`stat-metric-card ${statusGroupFilter === 'IN_PROGRESS' ? 'active-filter' : ''}`}
          onClick={() => setStatusGroupFilter('IN_PROGRESS')}
        >
          <div className="stat-metric-info">
            <span className="stat-metric-label">Đang được xử lý</span>
            <span className="stat-metric-number" style={{ color: '#0284c7' }}>
              {stats.inProgress}
            </span>
          </div>
          <div className="stat-metric-icon-box" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Clock size={22} />
          </div>
        </div>

        <div
          className={`stat-metric-card ${stats.actionNeeded > 0 ? 'alert-action' : ''} ${statusGroupFilter === 'ACTION_NEEDED' ? 'active-filter' : ''}`}
          onClick={() => setStatusGroupFilter('ACTION_NEEDED')}
        >
          <div className="stat-metric-info">
            <span className="stat-metric-label">
              {stats.actionNeeded > 0 ? '⚡ Cần bạn xác nhận / Bổ sung' : 'Chờ bạn xác nhận'}
            </span>
            <span className="stat-metric-number">{stats.actionNeeded}</span>
          </div>
          <div
            className="stat-metric-icon-box"
            style={{
              backgroundColor: stats.actionNeeded > 0 ? '#fef3c7' : '#f1f5f9',
              color: stats.actionNeeded > 0 ? '#d97706' : '#64748b',
            }}
          >
            <AlertCircle size={22} />
          </div>
        </div>

        <div
          className={`stat-metric-card ${statusGroupFilter === 'COMPLETED' ? 'active-filter' : ''}`}
          onClick={() => setStatusGroupFilter('COMPLETED')}
        >
          <div className="stat-metric-info">
            <span className="stat-metric-label">Đã hoàn thành</span>
            <span className="stat-metric-number" style={{ color: '#229a58' }}>
              {stats.completed}
            </span>
          </div>
          <div className="stat-metric-icon-box" style={{ backgroundColor: '#e9f7ee', color: '#229A58' }}>
            <CheckCircle size={22} />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="requester-filter-container">
        <div className="requester-filter-row">
          <div className="filter-left-controls">
            {/* Search Box */}
            <div style={{ position: 'relative', width: 280 }}>
              <input
                type="text"
                placeholder="Tìm mã YC, thiết bị, phòng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  fontSize: '0.85rem',
                }}
              />
              <Search
                size={16}
                color="var(--color-text-tertiary)"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Building Zone filter (Khu A, C, D, E, F, G, H) */}
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="form-control"
              style={{ width: 170, fontSize: '0.85rem' }}
            >
              <option value="">-- Tất cả các Khu --</option>
              {CAMPUS_BUILDINGS.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.code} ({b.name})
                </option>
              ))}
            </select>

            {/* General Facility Category Filter */}
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="form-control"
              style={{ width: 190, fontSize: '0.85rem' }}
            >
              <option value="">-- Tất cả cơ sở vật chất --</option>
              {COMMON_FACILITIES.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusGroupFilter}
              onChange={(e) => setStatusGroupFilter(e.target.value)}
              className="form-control"
              style={{ width: 180, fontSize: '0.85rem' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="ACTION_NEEDED">Chờ bạn xác nhận / Bổ sung</option>
              <option value="COMPLETED">Đã hoàn thành</option>
            </select>

            {(search || buildingFilter || facilityFilter || statusGroupFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setBuildingFilter('');
                  setFacilityFilter('');
                  setStatusGroupFilter('ALL');
                }}
              >
                Đặt lại lọc
              </Button>
            )}
          </div>

          {/* View mode toggle: Cards vs Table */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Xem dạng thẻ trực quan"
            >
              <Grid size={15} />
              <span>Dạng thẻ</span>
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Xem dạng danh sách bảng"
            >
              <List size={15} />
              <span>Dạng bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. CONTENT AREA: Cards View or Table View */}
      {filteredRequests.length === 0 ? (
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            border: '1px solid var(--color-border)',
            padding: '54px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'var(--color-due-blue-light)',
              color: 'var(--color-due-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <FileText size={28} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            Không tìm thấy yêu cầu sửa chữa nào
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 20, maxWidth: 440, margin: '0 auto 20px auto' }}>
            Bạn chưa có yêu cầu nào phù hợp với bộ lọc hiện tại. Nếu phòng học hoặc thiết bị gặp sự cố, hãy gửi yêu cầu ngay.
          </p>
          <Button variant="primary" icon={PlusCircle} onClick={() => navigate('/requests/create')}>
            Tạo yêu cầu sửa chữa mới ngay
          </Button>
        </div>
      ) : viewMode === 'cards' ? (
        /* GRID CARDS VIEW */
        <div className="request-cards-grid">
          {filteredRequests.map((req) => {
            const category = resolveFacilityCategory(req);
            const Icon = category.icon;
            const isWaitingConfirmation = req.status === REQUEST_STATUS.WAITING_FOR_CONFIRMATION;
            const isNeedsInfo = req.status === REQUEST_STATUS.NEEDS_INFORMATION;

            return (
              <div key={req.id} className="request-ticket-card">
                <div>
                  {/* Card Header */}
                  <div className="ticket-card-header">
                    <div className="ticket-facility-badge">
                      <div
                        className="ticket-fac-icon-wrapper"
                        style={{ backgroundColor: category.bgColor, color: category.color }}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <span className="ticket-id-tag">{req.id}</span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)' }}>
                          {category.name}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <StatusBadge status={req.status} />
                      <PriorityBadge priority={req.priority} />
                    </div>
                  </div>

                  {/* Incident Description / Title */}
                  <div
                    className="ticket-title-link"
                    onClick={() => {
                      setDetailRequest(req);
                      setDetailModalOpen(true);
                    }}
                    title={req.description || req.title}
                  >
                    {req.description || req.title}
                  </div>

                  {/* Location & Building & Date */}
                  <div className="ticket-location-meta">
                    <MapPin size={14} color="var(--color-due-blue)" />
                    <span>
                      <strong>{req.building}</strong> • {req.location}
                    </span>
                    <span>•</span>
                    <Calendar size={14} color="var(--color-text-tertiary)" />
                    <span>{formatDate(req.createdAt)}</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="ticket-card-footer">
                  <div className="ticket-technician-meta">
                    <Wrench size={13} color="var(--color-text-tertiary)" />
                    <span>
                      CBKT: <strong>{req.assignedStaffName || 'Đang phân công'}</strong>
                    </span>
                  </div>

                  <div className="ticket-actions-group">
                    {/* Action button if waiting for Requester Confirmation */}
                    {isWaitingConfirmation && (
                      <button
                        type="button"
                        className="btn-confirm-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                          setConfirmResult('PASS');
                          setConfirmFeedback('');
                          setConfirmModalOpen(true);
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>Xác nhận kết quả</span>
                      </button>
                    )}

                    {/* Action button if needs info */}
                    {isNeedsInfo && (
                      <Button
                        variant="warning"
                        size="sm"
                        icon={MessageSquare}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                          setSupplementText('');
                          setSupplementModalOpen(true);
                        }}
                      >
                        Bổ sung TT
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      icon={Eye}
                      onClick={() => {
                        setDetailRequest(req);
                        setDetailModalOpen(true);
                      }}
                    >
                      Chi tiết
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <DataTable
          columns={columns}
          data={filteredRequests}
          keyField="id"
          pageSize={10}
          onRowClick={(row) => {
            navigate(`/requests/${row.id}`);
          }}
        />
      )}

      {/* 5. Requester Confirm Internal Repair Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={`Xác nhận kết quả sửa chữa: ${selectedRequest?.id}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant={confirmResult === 'PASS' ? 'primary' : 'danger'}
              onClick={handleConfirmInternal}
            >
              {confirmResult === 'PASS' ? 'Xác nhận hài lòng & Hoàn thành' : 'Gửi yêu cầu kiểm tra lại'}
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '1rem', marginBottom: 4 }}>
            {selectedRequest?.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Cán bộ phụ trách: <strong>{selectedRequest?.assignedStaffName}</strong> đã hoàn thành các hạng mục sửa chữa và đề nghị bạn nghiệm thu thực tế tại phòng.
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Đánh giá kết quả kiểm tra sử dụng thực tế:</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                borderRadius: '8px',
                border: `2px solid ${confirmResult === 'PASS' ? 'var(--color-green)' : 'var(--color-border)'}`,
                backgroundColor: confirmResult === 'PASS' ? 'var(--color-green-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: confirmResult === 'PASS' ? 'var(--color-green)' : 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="confirmResult"
                checked={confirmResult === 'PASS'}
                onChange={() => setConfirmResult('PASS')}
              />
              Đã hoạt động tốt (Đạt)
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                borderRadius: '8px',
                border: `2px solid ${confirmResult === 'FAIL' ? 'var(--color-danger)' : 'var(--color-border)'}`,
                backgroundColor: confirmResult === 'FAIL' ? 'var(--color-danger-light)' : 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                color: confirmResult === 'FAIL' ? 'var(--color-danger)' : 'var(--color-text)',
              }}
            >
              <input
                type="radio"
                name="confirmResult"
                checked={confirmResult === 'FAIL'}
                onChange={() => setConfirmResult('FAIL')}
              />
              Chưa đạt / Vẫn còn lỗi
            </label>
          </div>
        </div>

        <Textarea
          label={confirmResult === 'PASS' ? 'Nhận xét thêm (không bắt buộc)' : 'Mô tả chi tiết điểm chưa đạt (bắt buộc) *'}
          required={confirmResult === 'FAIL'}
          value={confirmFeedback}
          onChange={(e) => setConfirmFeedback(e.target.value)}
          placeholder={
            confirmResult === 'PASS'
              ? 'Thiết bị hoạt động êm ái, mát tốt, cảm ơn cán bộ kỹ thuật.'
              : 'Thiết bị vẫn phát ra tiếng kêu rít hoặc chưa bật được nguồn...'
          }
          rows={3}
        />
      </Modal>

      {/* 6. Supplement Info Modal */}
      <Modal
        isOpen={supplementModalOpen}
        onClose={() => setSupplementModalOpen(false)}
        title={`Bổ sung thông tin cho yêu cầu: ${selectedRequest?.id}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSupplementModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSupplement}>
              Gửi bổ sung thông tin
            </Button>
          </>
        }
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
            {selectedRequest?.title}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-warning)' }}>
            Quản trị CSVC đề nghị bổ sung chi tiết để có căn cứ khảo sát và phê duyệt phương án sửa chữa.
          </div>
        </div>

        <Textarea
          label="Nội dung thông tin bổ sung"
          required
          value={supplementText}
          onChange={(e) => setSupplementText(e.target.value)}
          placeholder="Nhập thông tin chỉ dẫn vị trí chính xác hơn hoặc hiện tượng phát sinh..."
          rows={4}
        />
      </Modal>

      {/* 7. Quick Detail Modal */}
      {detailRequest && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Chi tiết yêu cầu sửa chữa: ${detailRequest.id}`}
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDetailModalOpen(false);
                  navigate(`/requests/${detailRequest.id}`);
                }}
              >
                Mở trang chi tiết đầy đủ &raquo;
              </Button>
              <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--color-due-blue)',
                  backgroundColor: 'var(--color-due-blue-light)',
                  padding: '3px 10px',
                  borderRadius: 6,
                }}
              >
                {detailRequest.id}
              </span>
              <PriorityBadge priority={detailRequest.priority} />
              <StatusBadge status={detailRequest.status} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 16, lineHeight: 1.4 }}>
              {detailRequest.title && detailRequest.title !== detailRequest.description
                ? detailRequest.title
                : `${resolveFacilityCategory(detailRequest).name} • ${detailRequest.building} - ${detailRequest.location}`}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                backgroundColor: 'var(--color-surface-muted)',
                padding: '14px 16px',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: '0.8125rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Khu vực: </span>
                <strong>{detailRequest.building}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Vị trí: </span>
                <strong>{detailRequest.location}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Cán bộ kỹ thuật phụ trách: </span>
                <strong>
                  {detailRequest.assignedStaffName
                    ? `${detailRequest.assignedStaffName} (Tổ Kỹ thuật • SĐT: 0903456789)`
                    : 'Đang chờ Quản trị CSVC phân công'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Ngày gửi yêu cầu: </span>
                <strong>{formatDate(detailRequest.createdAt)}</strong>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 6 }}>Nội dung sự cố mô tả:</h4>
              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text)',
                  backgroundColor: '#fff',
                  border: '1px solid var(--color-border)',
                  padding: 12,
                  borderRadius: 6,
                  whiteSpace: 'pre-line',
                }}
              >
                {detailRequest.description}
              </div>
            </div>

            {/* Timeline history */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 10 }}>Dòng thời gian xử lý:</h4>
              <div style={{ borderLeft: '2px solid var(--color-due-blue)', paddingLeft: 14, marginLeft: 6 }}>
                {(detailRequest.timeline || []).map((t, idx) => (
                  <div key={idx} style={{ marginBottom: 12, position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -20,
                        top: 2,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: t.status === 'COMPLETED' ? '#229A58' : '#1677C8',
                        border: '2px solid #fff',
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                      {t.stage}
                    </div>
                    {t.note && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {t.note}
                      </div>
                    )}
                    {t.updatedAt && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                        {formatDate(t.updatedAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
