import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS } from '../../../dung-chung/hang-so/statuses';
import { PRIORITY } from '../../../dung-chung/hang-so/priorities';
import {
  COMMON_FACILITIES,
  CAMPUS_BUILDINGS,
  REQUESTER_TYPES,
} from '../../../dung-chung/hang-so/commonFacilities';
import { generateRequestId } from '../../../dung-chung/tien-ich/generateId';
import {
  ArrowLeft,
  Send,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Check,
  Sparkles,
  Info,
  Clock,
  MapPin,
  User,
  Phone,
  GraduationCap,
  Briefcase,
  AlertCircle,
  HelpCircle,
  Package,
} from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import Button from '../../../dung-chung/thanh-phan/Button';
import Input from '../../../dung-chung/thanh-phan/Input';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';
import PriorityBadge from '../../../dung-chung/thanh-phan/PriorityBadge';
import StatusBadge from '../../../dung-chung/thanh-phan/StatusBadge';
import './RequestCreatePage.css';

export default function RequestCreatePage() {
  const { currentUser, addRequest, addToast } = useApp();
  const navigate = useNavigate();

  // Selected requester role (Lecturer/Staff or Student)
  const [requesterType, setRequesterType] = useState('LECTURER');

  // Selected general facility (empty by default so user can choose)
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);

  // Selected building zone (A, C, D, E, F, G, H - empty by default)
  const [selectedBuilding, setSelectedBuilding] = useState('');

  // Form input data - Empty by default, using placeholders instead of prefilled inputs
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    priority: PRIORITY.MEDIUM,
    discoveredAt: new Date().toISOString().slice(0, 16),
    description: '',
    contactPhone: currentUser?.phone || '',
    contactName: currentUser?.name || '',
    department: currentUser?.department || '',
  });

  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active facility meta
  const currentFacility = selectedFacilityId
    ? COMMON_FACILITIES.find((f) => f.id === selectedFacilityId) || null
    : null;

  // When facility category changes: DO NOT pre-populate title value, keep it as placeholder
  const handleSelectFacility = (fac) => {
    setSelectedFacilityId(fac.id);
    if (errors.facilityId) {
      setErrors((prev) => ({ ...prev, facilityId: null }));
    }
  };

  // When quick issue chip is clicked: insert into description as quick helper
  const handleApplyQuickIssue = (issueText) => {
    setFormData((prev) => ({
      ...prev,
      description: prev.description
        ? `${prev.description}\n- ${issueText}`
        : `Hiện trạng: ${issueText}`,
    }));
    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: null }));
    }
  };

  // Building zone change
  const handleSelectBuilding = (buildingCode) => {
    setSelectedBuilding(buildingCode);
    if (errors.building) {
      setErrors((prev) => ({ ...prev, building: null }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // File upload handler
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map((file) => ({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type.includes('image') ? 'image' : 'doc',
    }));
    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Vui lòng nhập tiêu đề sự cố';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Tiêu đề cần tối thiểu 5 ký tự';
    }

    if (!selectedFacilityId) {
      newErrors.facilityId = 'Vui lòng chọn loại cơ sở vật chất';
    }

    if (!selectedBuilding) {
      newErrors.building = 'Vui lòng chọn khu tòa nhà';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Vui lòng ghi rõ phòng hoặc vị trí cụ thể (VD: Phòng C101)';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Vui lòng mô tả chi tiết tình trạng sự cố';
    } else if (formData.description.trim().length < 8) {
      newErrors.description = 'Mô tả cần ít nhất 8 ký tự để cán bộ kỹ thuật nắm được hiện trạng';
    }

    if (!formData.contactPhone.trim()) {
      newErrors.contactPhone = 'Vui lòng nhập số điện thoại để kỹ thuật viên liên hệ kiểm tra';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc (*)', 'error');
      return;
    }

    setIsSubmitting(true);
    const newRequestId = generateRequestId();
    const now = new Date().toISOString();

    const facilityName = currentFacility ? currentFacility.name : 'Cơ sở vật chất';
    const facilityType = currentFacility ? currentFacility.shortName : 'Khác';
    const facilityCategory = currentFacility ? currentFacility.id : 'khac';

    const newRequest = {
      id: newRequestId,
      title: formData.title.trim(),
      facilityId: currentFacility ? `CSVC-${currentFacility.id.toUpperCase()}` : 'CSVC-GEN',
      facilityName: `${facilityName} (${formData.location.trim()})`,
      facilityCategory: facilityCategory,
      facilityType: facilityType,
      building: selectedBuilding,
      location: formData.location.trim(),
      requesterId: currentUser?.id || 'U01',
      requesterName: formData.contactName.trim() || currentUser?.name || 'Người yêu cầu',
      requesterType: requesterType, // 'LECTURER' or 'STUDENT'
      department: formData.department.trim() || currentUser?.department || 'Trường ĐH Kinh tế',
      contactInfo: formData.contactPhone.trim(),
      contactPhone: formData.contactPhone.trim(),
      priority: formData.priority,
      status: REQUEST_STATUS.NEW,
      repairType: null,
      createdAt: now,
      discoveredAt: formData.discoveredAt,
      description: formData.description.trim(),
      assignedStaffId: null,
      assignedStaffName: null,
      attachments: attachments.map((a) => a.name),
      timeline: [
        {
          stage: 'Gửi yêu cầu',
          status: 'COMPLETED',
          updatedAt: now,
          updatedBy: formData.contactName.trim() || currentUser?.name || 'Người yêu cầu',
          note: `Yêu cầu báo hỏng ${facilityName} tại ${selectedBuilding} - ${formData.location} đã được gửi thành công. Chờ Quản trị CSVC tiếp nhận.`,
        },
        {
          stage: 'Tiếp nhận & Phân công',
          status: 'PENDING',
        },
        {
          stage: 'Khảo sát hiện trạng',
          status: 'PENDING',
        },
        {
          stage: 'Lập & Phê duyệt phương án',
          status: 'PENDING',
        },
        {
          stage: 'Thực hiện sửa chữa',
          status: 'PENDING',
        },
        {
          stage: 'Nghiệm thu & Xác nhận',
          status: 'PENDING',
        },
      ],
      history: [
        {
          date: now,
          action: 'Tạo yêu cầu',
          actor: formData.contactName.trim() || currentUser?.name || 'Người yêu cầu',
          detail: `Báo hỏng ${facilityName} (${selectedBuilding} - ${formData.location}). Mức độ: ${formData.priority}.`,
        },
      ],
    };

    addRequest(newRequest);
    addToast(`Đã tạo thành công phiếu yêu cầu ${newRequestId}!`, 'success');

    setTimeout(() => {
      navigate('/my-requests');
    }, 400);
  };

  const FacilityIcon = currentFacility ? currentFacility.icon : Package;

  return (
    <div className="request-create-container">
      <PageHeader
        title="Tạo yêu cầu sửa chữa cơ sở vật chất"
        description="Dành cho Giảng viên và Sinh viên khi gặp sự cố cơ sở vật chất (máy chiếu, điều hòa, quạt, ô tô, điện nước,...)"
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/my-requests')}>
            Quay lại Yêu cầu của tôi
          </Button>
        }
      />

      <div className="request-create-grid">
        {/* LEFT COLUMN: Main Form */}
        <div className="create-form-card">
          <form onSubmit={handleSubmit}>
            {/* 1. Chọn đối tượng người gửi */}
            <div className="form-section-block">
              <div className="form-section-header">
                <span className="section-number-badge">1</span>
                <div>
                  <h3 className="section-title">Bạn gửi yêu cầu với tư cách là</h3>
                  <div className="section-desc">Chọn đúng đối tượng để bộ phận kỹ thuật phối hợp phù hợp nhất</div>
                </div>
              </div>

              <div className="requester-type-selector">
                <button
                  type="button"
                  className={`requester-type-chip ${requesterType === 'LECTURER' ? 'selected' : ''}`}
                  onClick={() => setRequesterType('LECTURER')}
                >
                  <Briefcase size={18} />
                  <span>Giảng viên / Cán bộ nhân viên</span>
                  {requesterType === 'LECTURER' && <Check size={16} />}
                </button>

                <button
                  type="button"
                  className={`requester-type-chip ${requesterType === 'STUDENT' ? 'selected' : ''}`}
                  onClick={() => setRequesterType('STUDENT')}
                >
                  <GraduationCap size={18} />
                  <span>Sinh viên / Học viên</span>
                  {requesterType === 'STUDENT' && <Check size={16} />}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <Input
                  label="Họ và tên người gửi"
                  required
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="Họ và tên"
                />

                <Input
                  label={requesterType === 'LECTURER' ? 'Khoa / Bộ môn / Đơn vị' : 'Lớp sinh hoạt / Khoa'}
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder={requesterType === 'LECTURER' ? 'VD: Khoa QTKD' : 'VD: 47K01.1 - Khoa QTKD'}
                />

                <Input
                  label="Số điện thoại liên hệ (để CBKT gọi trực tiếp)"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  placeholder="VD: 0901234567"
                  error={errors.contactPhone}
                />
              </div>
            </div>

            {/* 2. Chọn loại Cơ sở vật chất chung chung */}
            <div className="form-section-block">
              <div className="form-section-header">
                <span className="section-number-badge">2</span>
                <div>
                  <h3 className="section-title">Chọn cơ sở vật chất / Thiết bị gặp sự cố *</h3>
                  <div className="section-desc">
                    Chọn nhóm thiết bị chung chung (Máy chiếu, Điều hòa, Quạt, Ô tô,...) - Không cần ghi mã chi tiết
                  </div>
                </div>
              </div>

              <div className="facility-category-grid">
                {COMMON_FACILITIES.map((fac) => {
                  const Icon = fac.icon;
                  const isSelected = selectedFacilityId === fac.id;

                  return (
                    <div
                      key={fac.id}
                      className={`facility-card-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectFacility(fac)}
                      role="button"
                      tabIndex={0}
                    >
                      {isSelected && (
                        <div className="facility-card-check">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                      <div
                        className="facility-card-icon-box"
                        style={{ backgroundColor: fac.bgColor, color: fac.color }}
                      >
                        <Icon size={22} />
                      </div>
                      <div className="facility-card-name">{fac.name}</div>
                      <div className="facility-card-desc">{fac.description}</div>
                    </div>
                  );
                })}
              </div>
              {errors.facilityId && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.8125rem', marginTop: 8, fontWeight: 500 }}>
                  ⚠️ {errors.facilityId}
                </div>
              )}

              {/* Quick Issue Suggestion Chips */}
              {currentFacility && currentFacility.commonIssues?.length > 0 && (
                <div className="quick-issue-box">
                  <div className="quick-issue-title">
                    <Sparkles size={14} /> Gợi ý sự cố phổ biến của {currentFacility.name} (nhấn để chèn vào mô tả):
                  </div>
                  <div className="quick-issue-chips">
                    {currentFacility.commonIssues.map((issue, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="quick-issue-chip"
                        onClick={() => handleApplyQuickIssue(issue)}
                      >
                        + {issue}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Vị trí: Khu / Tòa nhà & Phòng cụ thể */}
            <div className="form-section-block">
              <div className="form-section-header">
                <span className="section-number-badge">3</span>
                <div>
                  <h3 className="section-title">Khu vực / Tòa nhà & Vị trí phòng *</h3>
                  <div className="section-desc">Trường có các khu: Khu A, C, D, E, F, G, H</div>
                </div>
              </div>

              {/* Building Zone Chips */}
              <div className="building-chips-container">
                {CAMPUS_BUILDINGS.map((b) => {
                  const isSelected = selectedBuilding === b.code;
                  return (
                    <div
                      key={b.id}
                      className={`building-chip-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectBuilding(b.code)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="building-code-label">{b.code}</span>
                        {isSelected && <Check size={14} color="var(--color-due-blue)" strokeWidth={3} />}
                      </div>
                      <div className="building-desc-sub">{b.desc}</div>
                    </div>
                  );
                })}
              </div>
              {errors.building && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.8125rem', marginTop: 8, fontWeight: 500 }}>
                  ⚠️ {errors.building}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                <Input
                  label="Vị trí / Phòng học / Phòng làm việc cụ thể"
                  required
                  placeholder="VD: Phòng 101, Phòng 204, Hội trường F, Sân A, v.v."
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  error={errors.location}
                />

                <Input
                  label="Thời điểm phát hiện sự cố"
                  type="datetime-local"
                  value={formData.discoveredAt}
                  onChange={(e) => handleInputChange('discoveredAt', e.target.value)}
                />
              </div>
            </div>

            {/* 4. Mức độ ưu tiên / Khẩn cấp */}
            <div className="form-section-block">
              <div className="form-section-header">
                <span className="section-number-badge">4</span>
                <div>
                  <h3 className="section-title">Mức độ khẩn cấp của sự cố</h3>
                  <div className="section-desc">Đánh giá mức độ ảnh hưởng để ưu tiên sắp xếp lịch sửa chữa</div>
                </div>
              </div>

              <div className="priority-selector-grid">
                <div
                  className={`priority-card-opt p-low ${formData.priority === PRIORITY.LOW ? 'selected' : ''}`}
                  onClick={() => handleInputChange('priority', PRIORITY.LOW)}
                >
                  <span className="priority-badge-pill" style={{ color: 'var(--color-green)' }}>
                    🟢 Thấp / Bình thường
                  </span>
                  <span className="priority-desc-text">
                    Sự cố nhỏ, chưa ảnh hưởng ngay đến việc dạy & học, có thể xử lý định kỳ.
                  </span>
                </div>

                <div
                  className={`priority-card-opt p-medium ${formData.priority === PRIORITY.MEDIUM ? 'selected' : ''}`}
                  onClick={() => handleInputChange('priority', PRIORITY.MEDIUM)}
                >
                  <span className="priority-badge-pill" style={{ color: 'var(--color-warning)' }}>
                    🟡 Cần xử lý sớm (Trong tuần)
                  </span>
                  <span className="priority-desc-text">
                    Ảnh hưởng đến tiện nghi hoặc lịch học sắp tới trong tuần.
                  </span>
                </div>

                <div
                  className={`priority-card-opt p-urgent ${formData.priority === PRIORITY.URGENT || formData.priority === PRIORITY.HIGH ? 'selected' : ''}`}
                  onClick={() => handleInputChange('priority', PRIORITY.HIGH)}
                >
                  <span className="priority-badge-pill" style={{ color: 'var(--color-danger)' }}>
                    🔴 Khẩn cấp / Cần ngay
                  </span>
                  <span className="priority-desc-text">
                    Nguy cơ chập cháy, an toàn, mất điện/nước toàn khu hoặc phòng đang diễn ra buổi thi/sự kiện.
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Tiêu đề & Chi tiết sự cố */}
            <div className="form-section-block">
              <div className="form-section-header">
                <span className="section-number-badge">5</span>
                <div>
                  <h3 className="section-title">Mô tả chi tiết tình trạng sự cố *</h3>
                  <div className="section-desc">Cung cấp hiện tượng để cán bộ kỹ thuật chuẩn bị trước linh kiện, công cụ</div>
                </div>
              </div>

              <Input
                label="Tiêu đề yêu cầu sửa chữa"
                required
                placeholder={
                  currentFacility
                    ? `VD: ${currentFacility.shortName} không hoạt động, chảy nước, hỏng nguồn...`
                    : 'VD: Điều hòa không lạnh, máy chiếu không lên nguồn, quạt rung lắc...'
                }
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                error={errors.title}
              />

              <Textarea
                label="Mô tả cụ thể hiện trạng hư hỏng"
                required
                rows={4}
                placeholder="Mô tả cụ thể hiện trạng hư hỏng (VD: thiết bị mất nguồn, kêu to, chảy nước, chập chờn, ảnh hưởng bao nhiêu người...)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                error={errors.description}
              />

              {/* Upload Ảnh / Tài liệu */}
              <div style={{ marginTop: 16 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                  Hình ảnh hoặc tài liệu hiện trạng (đính kèm minh chứng)
                </label>
                <div className="upload-dropzone-box">
                  <Upload size={28} style={{ color: 'var(--color-due-blue)', marginBottom: 8 }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Kéo thả ảnh chụp sự cố hoặc nhấn để chọn tệp
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                    Hỗ trợ định dạng JPG, PNG, PDF (tối đa 10MB)
                  </div>
                  <label
                    style={{
                      display: 'inline-block',
                      marginTop: 10,
                      padding: '6px 16px',
                      backgroundColor: '#fff',
                      border: '1px solid var(--color-border)',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--color-due-blue)',
                    }}
                  >
                    Chọn ảnh từ thiết bị
                    <input type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="file-preview-list">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="file-preview-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                          {file.type === 'image' ? (
                            <ImageIcon size={18} color="#1677C8" />
                          ) : (
                            <FileText size={18} color="#F58220" />
                          )}
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{file.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>{file.size}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-danger)',
                            padding: 4,
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="form-submit-actions">
              <Button variant="secondary" onClick={() => navigate('/my-requests')}>
                Hủy bỏ
              </Button>
              <button type="submit" className="btn-submit-request" disabled={isSubmitting}>
                <Send size={18} />
                <span>{isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu sửa chữa ngay'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Live Ticket Preview */}
        <div className="live-preview-sidebar">
          <div className="ticket-preview-card">
            <div className="ticket-preview-header">
              <span className="ticket-tag-title">Xem trước phiếu yêu cầu</span>
              <StatusBadge status={REQUEST_STATUS.NEW} />
            </div>

            <div className="ticket-preview-body">
              <div className="ticket-preview-facility">
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    backgroundColor: currentFacility ? currentFacility.bgColor : '#f1f5f9',
                    color: currentFacility ? currentFacility.color : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FacilityIcon size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>
                    {currentFacility ? currentFacility.name : '(Chưa chọn cơ sở vật chất)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Cơ sở vật chất trường DUE
                  </div>
                </div>
              </div>

              <div className="ticket-preview-meta-row">
                <span className="ticket-meta-label">Tiêu đề sự cố:</span>
                <span className="ticket-meta-value" style={{ fontSize: '0.95rem' }}>
                  {formData.title || '(Chưa nhập tiêu đề)'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="ticket-preview-meta-row">
                  <span className="ticket-meta-label">Khu vực / Tòa nhà:</span>
                  <span
                    className="ticket-meta-value"
                    style={{ color: selectedBuilding ? 'var(--color-due-blue)' : 'var(--color-text-tertiary)' }}
                  >
                    {selectedBuilding ? `📍 ${selectedBuilding}` : '(Chưa chọn khu)'}
                  </span>
                </div>
                <div className="ticket-preview-meta-row">
                  <span className="ticket-meta-label">Phòng / Vị trí:</span>
                  <span className="ticket-meta-value">
                    {formData.location || '(Chưa nhập phòng)'}
                  </span>
                </div>
              </div>

              <div className="ticket-preview-meta-row">
                <span className="ticket-meta-label">Mức độ ưu tiên:</span>
                <div>
                  <PriorityBadge priority={formData.priority} />
                </div>
              </div>

              <div className="ticket-preview-meta-row">
                <span className="ticket-meta-label">Người báo hỏng:</span>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                  <strong>{formData.contactName}</strong> ({requesterType === 'LECTURER' ? 'Giảng viên' : 'Sinh viên'} - {formData.department})
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    SĐT liên hệ: <strong>{formData.contactPhone}</strong>
                  </div>
                </div>
              </div>

              <div className="ticket-preview-meta-row">
                <span className="ticket-meta-label">Mô tả hiện trạng:</span>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text)',
                    backgroundColor: '#fff',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    maxHeight: 120,
                    overflowY: 'auto',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {formData.description || '(Chưa có nội dung mô tả)'}
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="ticket-preview-meta-row">
                  <span className="ticket-meta-label">Đính kèm:</span>
                  <span className="ticket-meta-value" style={{ color: 'var(--color-due-blue)' }}>
                    📎 {attachments.length} tệp đính kèm
                  </span>
                </div>
              )}
            </div>

            <div className="ticket-preview-footer-note">
              <Info size={16} color="var(--color-due-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Phiếu yêu cầu sẽ được gửi tức thì đến <strong>Phòng Quản trị Cơ sở vật chất</strong> để tiếp nhận và phân công cán bộ kỹ thuật kiểm tra xử lý.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
