"""Danh mục nghiệp vụ dùng chung cho Trợ lý AI và bộ luật dự phòng."""

import re
import unicodedata

from core.models import IssueCategory

CATEGORY_LABELS = dict(IssueCategory.choices)

PRIORITY_LABELS = {
    "LOW": "Xử lý sau (3-5 ngày)",
    "MEDIUM": "Xử lý sớm (24-48 giờ)",
    "HIGH": "Khẩn cấp (trong ngày)",
    "URGENT": "Rất khẩn cấp - nguy cơ mất an toàn (xử lý ngay)",
}

ACTIVE_STATUSES = (
    "NEW", "NEEDS_INFORMATION", "ACCEPTED", "SURVEYING", "WAITING_FOR_PLAN",
    "WAITING_FOR_APPROVAL", "INTERNAL_REPAIR", "WAITING_FOR_EXTERNAL_WORK",
    "EXTERNAL_WORK_IN_PROGRESS", "WAITING_FOR_ACCEPTANCE", "WAITING_FOR_CONFIRMATION",
    "NEEDS_REMEDIATION", "WAITING_REMEDIATION_RESPONSE", "OVERDUE_REMEDIATION",
)

# Ngưỡng nghiệp vụ dùng trong gợi ý (đưa vào prompt để AI nhất quán với luật dự phòng).
INTERNAL_COST_LIMIT = 5_000_000
INTERNAL_APPROVAL_THRESHOLD = 3_000_000


def strip_accents(text):
    text = unicodedata.normalize("NFD", str(text or "").lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.replace("đ", "d")


# Từ khóa (không dấu, khớp theo ranh giới từ) -> loại sự cố. Dùng cụm từ để tránh nhầm
# do bỏ dấu (vd: "cua" = "của"/"cửa", "den" = "đến"/"đèn", "chay" = "chạy"/"cháy").
CATEGORY_KEYWORDS = [
    ("HVAC", ["dieu hoa", "may lanh", "dien lanh", "khong mat", "gas lanh", "quat thong gio", "dan nong", "dan lanh"]),
    ("AV_EQUIPMENT", ["may chieu", "projector", "loa", "micro", "am thanh", "man chieu", "tivi", "man hinh tuong tac", "len hinh"]),
    ("NETWORK_IT", ["mang noi bo", "diem mang", "ket noi mang", "mat mang", "toc do mang", "wifi", "internet", "switch", "router", "cap mang", "may tinh", "may in", "camera"]),
    ("PLUMBING", ["nuoc", "voi nuoc", "ong nuoc", "duong ong", "ro ri", "lavabo", "bon cau", "thoat nuoc", "tac nghen", "bi tac", "may bom"]),
    ("ELECTRICAL", ["dien", "o cam", "cong tac", "bong den", "he thong den", "den hanh lang", "den chieu sang", "den led", "den tuyp", "cau dao", "aptomat", "chap chon", "chap dien", "khet", "tia lua"]),
    ("FURNITURE", ["ban ghe", "mat ban", "chan ban", "ban hoc", "ban giang vien", "ban giao vien", "ghe", "tu ho so", "tu sach", "ke sach", "bang viet", "bang tu", "rem"]),
    ("BUILDING", ["canh cua", "cua phong", "cua so", "cua ra vao", "cua kinh", "o khoa", "khoa cua", "ban le", "tran nha", "tran thach cao", "tuong", "san nha", "mai ton", "mai nha", "vo kinh", "nut", "tham", "tham nuoc", "dot nuoc", "ngam nuoc", "tran phong", "son tuong", "gach", "cau thang", "lan can"]),
    ("SANITATION", ["ve sinh", "rac", "mui hoi", "con trung", "chuot", "moi mot"]),
]

FACILITY_TYPE_CATEGORY = {
    "thiet bi dien": "ELECTRICAL",
    "thiet bi cntt": "AV_EQUIPMENT",
    "he thong mang": "NETWORK_IT",
    "phong may tinh": "NETWORK_IT",
    "he thong nuoc": "PLUMBING",
    "noi that": "FURNITURE",
    "ha tang": "BUILDING",
}

SAFETY_KEYWORDS = [
    "boc chay", "bi chay", "dau hieu chay", "chay no", "khet", "tia lua", "boc khoi", "dien giat",
    "giat dien", "ro dien", "chap dien", "sap do", "nguy co sap", "nut lon", "vo kinh", "ngap",
    "ro gas", "phat no", "hoa hoan", "nong chay",
    "nguoi bi ket", "sinh vien bi ket", "bi ket trong", "mac ket", "ket trong thang may",
]
# Nước tiếp xúc thiết bị điện -> nguy cơ chập/giật điện dù người gửi không dùng từ "chập", "cháy".
WATER_KEYWORDS = ["dot nuoc", "nho nuoc", "tham nuoc", "nuoc chay", "ngam nuoc", "ro nuoc", "ngap"]
ELECTRIC_POINT_KEYWORDS = ["o cam", "o dien", "day dien", "cong tac", "tu dien", "aptomat", "cau dao"]
HIGH_IMPACT_KEYWORDS = [
    "khong hoat dong", "hong hoan toan", "khong su dung duoc", "anh huong giang day",
    "anh huong hoc tap", "ky thi", "lich thi", "phong thi", "ca phong", "toan bo", "ca tang",
    "mat dien", "mat nuoc",
    "khong len hinh", "khong vao duoc", "ro ri", "chay lien tuc",
]
LOW_IMPACT_KEYWORDS = [
    "tray", "bong son", "cu", "lech nhe", "keu nho", "tham my",
    "van su dung duoc", "van dung duoc", "hoi lung lay", "kiem tra khi tien",
]

# Tổ chuyên môn (từ khóa trong tên phòng ban, không dấu) -> các loại sự cố cán bộ xử lý được.
TEAM_SKILLS = [
    ("tong hop", ["ELECTRICAL", "BUILDING", "FURNITURE", "OTHER"]),
    ("dien lanh", ["HVAC"]),
    ("dien", ["ELECTRICAL"]),
    ("cntt", ["NETWORK_IT", "AV_EQUIPMENT"]),
    ("mang", ["NETWORK_IT"]),
    ("trinh chieu", ["AV_EQUIPMENT"]),
    ("nuoc", ["PLUMBING"]),
    ("ve sinh", ["SANITATION", "PLUMBING"]),
    ("xay dung", ["BUILDING"]),
    ("noi that", ["FURNITURE"]),
]


def staff_skills(user):
    department = strip_accents(user.department)
    skills = []
    for keyword, categories in TEAM_SKILLS:
        if keyword in department:
            skills.extend(c for c in categories if c not in skills)
    return skills or ["OTHER"]


def contains_keyword(blob, keyword):
    return re.search(rf"\b{re.escape(keyword.strip())}\b", blob) is not None


def matched_keywords(blob, keywords):
    return [kw for kw in keywords if contains_keyword(blob, kw)]


def guess_category(*texts, facility_type=""):
    blob = " ".join(strip_accents(t) for t in texts if t)
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS:
        hits = len(matched_keywords(blob, keywords))
        if hits:
            scores[category] = hits
    if scores:
        return max(scores, key=scores.get), scores
    mapped = FACILITY_TYPE_CATEGORY.get(strip_accents(facility_type))
    return (mapped or "OTHER"), {}


def category_label(code):
    return CATEGORY_LABELS.get(code, code or "Chưa phân loại")
