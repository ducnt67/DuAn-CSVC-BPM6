import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../ung-dung/bo-cung-cap/AppContext';
import { REQUEST_STATUS } from '../../../dung-chung/hang-so/statuses';
import { PRIORITY } from '../../../dung-chung/hang-so/priorities';
import { generateRequestId } from '../../../dung-chung/tien-ich/generateId';
import { ArrowLeft, Send, Upload, FileText, Image, Trash2 } from 'lucide-react';
import PageHeader from '../../../dung-chung/bo-cuc/PageHeader';
import Button from '../../../dung-chung/thanh-phan/Button';
import Input from '../../../dung-chung/thanh-phan/Input';
import Select from '../../../dung-chung/thanh-phan/Select';
import Textarea from '../../../dung-chung/thanh-phan/Textarea';

export default function RequestCreatePage() {
  const { facilities, currentUser, addRequest, addToast } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    facilityId: '',
    building: '',
    location: '',
    priority: PRIORITY.MEDIUM,
    discoveredAt: new Date().toISOString().slice(0, 16),
    description: '',
    contactPhone: currentUser?.phone || '',
  });

  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});

  // When facility changes, auto-fill building and location
  const handleFacilityChange = (e) => {
    const facId = e.target.value;
    const fac = facilities.find((f) => f.id === facId);
    setFormData((prev) => ({
      ...prev,
      facilityId: facId,
      building: fac ? fac.building : prev.building,
      location: fac ? fac.room : prev.location,
    }));
    if (errors.facilityId) {
      setErrors((prev) => ({ ...prev, facilityId: null }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Mock file attachment handler
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
      newErrors.title = 'Vui lòng nhập tiêu đề yêu cầu';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Tiêu đề cần tối thiểu 5 ký tự';
    }

    if (!formData.facilityId) {
      newErrors.facilityId = 'Vui lòng chọn cơ sở vật chất';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Vui lòng mô tả chi tiết sự cố hiện tại';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Mô tả cần ít nhất 10 ký tự để cán bộ kỹ thuật nắm được hiện trạng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Vui lòng kiểm tra các trường bắt buộc có dấu (*)', 'error');
      return;
    }

    const facility = facilities.find((f) => f.id === formData.facilityId);
    const newRequestId = generateRequestId();
    const now = new Date().toISOString();

    const newRequest = {
      id: newRequestId,
      title: formData.title.trim(),
      facilityId: formData.facilityId,
      facilityName: facility ? facility.name : 'Thiết bị trường',
      facilityType: facility ? facility.type : 'Cơ sở vật chất',
      building: formData.building,
      location: formData.location,
      requesterId: currentUser?.id || 'U01',
      requesterName: currentUser?.name || 'Nguyễn Minh Anh',
      department: currentUser?.department || 'Khoa Quản trị Kinh doanh',
      contactPhone: formData.contactPhone,
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
          stage: 'Tạo yêu cầu',
          status: 'COMPLETED',
          updatedAt: now,
          updatedBy: currentUser?.name || 'Người yêu cầu',
          note: 'Yêu cầu được khởi tạo thành công và đang chờ Quản trị CSVC tiếp nhận',
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
          stage: 'Nghiệm thu / Xác nhận hoàn thành',
          status: 'PENDING',
        },
      ],
      history: [
        {
          action: 'Khởi tạo yêu cầu sửa chữa',
          performedBy: currentUser?.name || 'Người yêu cầu',
          timestamp: now,
          note: 'Yêu cầu được gửi lên hệ thống.',
        },
      ],
    };

    addRequest(newRequest);
    addToast(`Tạo thành công yêu cầu ${newRequestId}`, 'success');
    navigate(`/requests/${newRequestId}`);
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <PageHeader
        title="Tạo yêu cầu sửa chữa cơ sở vật chất"
        description="Điền đầy đủ thông tin sự cố hư hỏng để Phòng CSVC và cán bộ kỹ thuật tiếp nhận xử lý"
        actions={
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        }
      />

      <div
        style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 28,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Section 1: Thông tin chung */}
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: '1px solid var(--color-border-light)',
              }}
            >
              1. Thông tin sự cố cơ sở vật chất
            </h3>

            <Input
              label="Tiêu đề yêu cầu sửa chữa"
              required
              placeholder="VD: Điều hòa phòng học C101 không lạnh, phát ra tiếng ồn lớn"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              error={errors.title}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              <Select
                label="Chọn cơ sở vật chất / Thiết bị cần sửa"
                required
                value={formData.facilityId}
                onChange={handleFacilityChange}
                error={errors.facilityId}
                placeholder="-- Chọn cơ sở vật chất trong danh mục --"
                options={facilities.map((f) => ({
                  value: f.id,
                  label: `${f.code} - ${f.name} (${f.building} - ${f.room})`,
                }))}
              />

              <Select
                label="Mức độ ưu tiên / Khẩn cấp"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                options={[
                  { value: PRIORITY.LOW, label: 'Thấp (Ảnh hưởng nhỏ, chưa gấp)' },
                  { value: PRIORITY.MEDIUM, label: 'Trung bình (Cần sửa trong tuần)' },
                  { value: PRIORITY.HIGH, label: 'Cao (Ảnh hưởng trực tiếp giờ giảng)' },
                  { value: PRIORITY.URGENT, label: 'Khẩn cấp (Nguy cơ chập cháy, an toàn)' },
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <Input
                label="Tòa nhà / Khu vực"
                value={formData.building}
                onChange={(e) => handleInputChange('building', e.target.value)}
                placeholder="VD: Khu C"
              />

              <Input
                label="Phòng / Vị trí chi tiết"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="VD: Phòng C101"
              />

              <Input
                label="Thời điểm phát hiện sự cố"
                type="datetime-local"
                value={formData.discoveredAt}
                onChange={(e) => handleInputChange('discoveredAt', e.target.value)}
              />
            </div>

            <Textarea
              label="Mô tả chi tiết tình trạng hư hỏng"
              required
              rows={4}
              placeholder="Mô tả cụ thể hiện tượng: máy không lên điện, có mùi khét, nước rò rỉ tại khớp nối, ảnh hưởng đến bao nhiêu người..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={errors.description}
            />
          </div>

          {/* Section 2: Hình ảnh / Tài liệu đính kèm */}
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: '1px solid var(--color-border-light)',
              }}
            >
              2. Hình ảnh hoặc tài liệu hiện trạng (đính kèm)
            </h3>

            <div
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface-muted)',
                marginBottom: 16,
              }}
            >
              <Upload size={32} style={{ color: 'var(--color-blue)', marginBottom: 8 }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Tải lên ảnh chụp sự cố hoặc tài liệu liên quan
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Hỗ trợ định dạng JPG, PNG, PDF (dung lượng tối đa 10MB)
              </div>
              <label
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  padding: '6px 16px',
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--color-blue)',
                }}
              >
                Chọn tệp từ máy
                <input
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      backgroundColor: 'var(--color-surface-muted)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {file.type === 'image' ? <Image size={16} color="#1677C8" /> : <FileText size={16} color="#F58220" />}
                    <span>{file.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                      ({file.size})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Người gửi */}
          <div style={{ marginBottom: 32 }}>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: '1px solid var(--color-border-light)',
              }}
            >
              3. Thông tin người gửi yêu cầu
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <Input
                label="Họ và tên người yêu cầu"
                disabled
                value={currentUser?.name || ''}
              />
              <Input
                label="Đơn vị / Khoa / Phòng ban"
                disabled
                value={currentUser?.department || ''}
              />
              <Input
                label="Số điện thoại liên hệ"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="VD: 0901234567"
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" icon={Send}>
              Gửi yêu cầu sửa chữa
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

