export const ISSUE_CATEGORY_LABELS = {
  ELECTRICAL: 'Điện',
  HVAC: 'Điều hòa - Điện lạnh',
  PLUMBING: 'Cấp thoát nước',
  NETWORK_IT: 'Mạng - CNTT',
  AV_EQUIPMENT: 'Thiết bị trình chiếu - Âm thanh',
  FURNITURE: 'Nội thất',
  BUILDING: 'Xây dựng - Cửa - Hạ tầng',
  SANITATION: 'Vệ sinh - Môi trường',
  OTHER: 'Khác',
};

export const ISSUE_CATEGORY_OPTIONS = Object.entries(ISSUE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const AI_KIND_LABELS = {
  TRIAGE: 'Phân loại & mức độ',
  TRIAGE_PREVIEW: 'Gợi ý khi tạo yêu cầu',
  ASSIGN_SURVEY: 'Phân công khảo sát',
  PLAN: 'Gợi ý phương án',
  APPROVAL_BRIEF: 'Hỗ trợ phê duyệt',
  ASSIGN_INSPECTOR: 'Phân công nghiệm thu',
  SURVEY_ASSIST: 'Hỗ trợ khảo sát',
  ACCEPTANCE_CHECKLIST: 'Checklist nghiệm thu',
  CONTRACTOR: 'Gợi ý nhà thầu',
  CHAT: 'Hỏi đáp trợ lý',
};

export const AI_RECOMMENDATION_LABELS = {
  APPROVE: 'Đề xuất duyệt',
  APPROVE_WITH_CONDITIONS: 'Duyệt có điều kiện',
  REVISE: 'Trả lại để điều chỉnh',
  REJECT: 'Đề xuất từ chối',
};

export const AI_STATUS_LABELS = {
  PENDING: 'Chưa quyết định',
  ACCEPTED: 'Chấp nhận',
  MODIFIED: 'Điều chỉnh',
  REJECTED: 'Không theo',
  NOT_APPLICABLE: 'Không áp dụng',
};
