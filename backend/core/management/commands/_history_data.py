"""Dữ liệu lịch sử & tình huống demo cho Trợ lý AI (dùng trong seed_demo).

Mỗi dòng lịch sử: (CSVC, loại sự cố, tiêu đề, mô tả, hình thức, chi phí, số ngày xử lý,
cán bộ, nhà thầu, mức độ, cờ). Cờ: "reject" = từng bị BGH từ chối dự toán cao hơn;
"fail" = lần nghiệm thu đầu không đạt; "late" = nhà thầu trễ hạn.
"""

EXTRA_STAFF = [
    ("U07", "tvdung", "Trần", "Văn Dũng", "STAFF", "Cán bộ kỹ thuật điện", "LECTURER", "Tổ Điện - Điện lạnh", "tvdung@due.edu.vn", "0906111222"),
    ("U08", "nqbao", "Nguyễn", "Quốc Bảo", "STAFF", "Cán bộ kỹ thuật CNTT", "LECTURER", "Tổ CNTT - Mạng & Thiết bị trình chiếu", "nqbao@due.edu.vn", "0906222333"),
    ("U09", "lvtoan", "Lê", "Văn Toàn", "STAFF", "Cán bộ kỹ thuật nước", "LECTURER", "Tổ Cấp thoát nước - Vệ sinh", "lvtoan@due.edu.vn", "0906333444"),
    ("U10", "pmkhoa", "Phạm", "Minh Khoa", "STAFF", "Cán bộ kỹ thuật xây dựng", "LECTURER", "Tổ Xây dựng - Nội thất", "pmkhoa@due.edu.vn", "0906444555"),
]

SONG_HAN = "Công ty TNHH Điện lạnh Sông Hàn"
MANG_MT = "Công ty Hạ tầng mạng miền Trung"
BAO_HANH = "Trung tâm bảo hành thiết bị"
HAI_VAN = "Công ty TNHH Cấp thoát nước Hải Vân"
THANH_CONG = "Xưởng nội thất Thành Công"
HOANG_LONG = "Cơ sở sửa chữa Hoàng Long"
HOA_KHANH = "Công ty CP Cơ điện lạnh Hòa Khánh"

HISTORY = [
    ("CSVC-005", "ELECTRICAL", "Thay bóng đèn hành lang tầng 2 Khu C", "3 bóng đèn tuýp hành lang bị cháy, hành lang tối buổi tối.", "INTERNAL", 450000, 1, "U07", "", "MEDIUM", ""),
    ("CSVC-005", "ELECTRICAL", "Đèn hành lang chập chờn, thay chấn lưu", "Đèn hành lang chập chờn liên tục, chấn lưu nóng.", "INTERNAL", 650000, 2, "U03", "", "MEDIUM", ""),
    ("CSVC-012", "ELECTRICAL", "Ổ cắm phòng D301 lỏng, đánh lửa", "Ổ cắm gần bục giảng lỏng, có tia lửa khi cắm sạc.", "INTERNAL", 300000, 1, "U07", "", "URGENT", ""),
    ("CSVC-001", "ELECTRICAL", "Công tắc đèn phòng C101 hỏng", "Công tắc dãy đèn cuối phòng bấm không ăn.", "INTERNAL", 150000, 1, "U03", "", "LOW", ""),
    ("CSVC-004", "ELECTRICAL", "Aptomat phòng F102 nhảy liên tục", "Aptomat tổng phòng làm việc nhảy khi bật máy in và điều hòa.", "INTERNAL", 900000, 1, "U07", "", "HIGH", ""),
    ("CSVC-006", "HVAC", "Điều hòa C101 không mát, cần vệ sinh nạp gas", "Điều hòa chạy nhưng không mát, ảnh hưởng giảng dạy buổi chiều.", "EXTERNAL", 1800000, 4, "U07", SONG_HAN, "HIGH", ""),
    ("CSVC-006", "HVAC", "Điều hòa C101 chảy nước dàn lạnh", "Dàn lạnh nhỏ nước xuống bàn giảng viên.", "INTERNAL", 400000, 1, "U07", "", "MEDIUM", ""),
    ("CSVC-002", "HVAC", "Điều hòa phòng C202 hỏng block", "Điều hòa không khởi động, dàn nóng có tiếng kêu lạ rồi tắt.", "EXTERNAL", 6500000, 7, "U07", SONG_HAN, "HIGH", "reject"),
    ("CSVC-003", "HVAC", "Điều hòa phòng máy E301 kêu to", "Điều hòa phòng máy kêu to, rung mạnh khi chạy.", "EXTERNAL", 2200000, 5, "U03", SONG_HAN, "MEDIUM", ""),
    ("CSVC-008", "PLUMBING", "Vòi lavabo tầng 1 Khu A rò rỉ", "Vòi lavabo nhỏ giọt liên tục.", "INTERNAL", 250000, 1, "U09", "", "MEDIUM", ""),
    ("CSVC-008", "PLUMBING", "Bồn cầu khu vệ sinh tầng 1 Khu A bị tắc", "Bồn cầu số 2 bị tắc, nước tràn ra sàn.", "INTERNAL", 350000, 1, "U09", "", "HIGH", ""),
    ("CSVC-008", "PLUMBING", "Đường ống cấp nước tầng 1 Khu A rò rỉ âm tường", "Tường khu vệ sinh ẩm, đồng hồ nước chạy dù đã khóa vòi.", "EXTERNAL", 4800000, 6, "U09", HAI_VAN, "HIGH", "fail"),
    ("CSVC-008", "PLUMBING", "Thay van khóa tổng khu vệ sinh", "Van khóa tổng bị kẹt, không khóa được nước.", "INTERNAL", 700000, 1, "U09", "", "MEDIUM", ""),
    ("CSVC-011", "NETWORK_IT", "Switch tầng 2 Khu E mất kết nối", "Toàn bộ phòng tầng 2 Khu E mất mạng, switch báo lỗi.", "EXTERNAL", 5200000, 5, "U08", MANG_MT, "HIGH", "fail"),
    ("CSVC-011", "NETWORK_IT", "Đi lại cáp mạng phòng E205", "Một số điểm mạng phòng E205 không nhận tín hiệu.", "INTERNAL", 900000, 2, "U08", "", "MEDIUM", ""),
    ("CSVC-003", "NETWORK_IT", "Phòng máy E301: 6 máy tính không vào mạng", "6 máy cuối phòng không có internet, ảnh hưởng tiết thực hành.", "INTERNAL", 600000, 1, "U08", "", "HIGH", ""),
    ("CSVC-011", "NETWORK_IT", "Wifi tầng 4 Khu E yếu, lắp thêm access point", "Sóng wifi tầng 4 rất yếu, sinh viên không truy cập được LMS.", "EXTERNAL", 7800000, 7, "U08", MANG_MT, "MEDIUM", "late"),
    ("CSVC-007", "AV_EQUIPMENT", "Máy chiếu D201 mờ, thay bóng đèn chiếu", "Hình chiếu rất mờ, bóng đèn đã quá số giờ sử dụng.", "EXTERNAL", 3200000, 6, "U08", BAO_HANH, "HIGH", ""),
    ("CSVC-007", "AV_EQUIPMENT", "Loa phòng D201 rè", "Loa trợ giảng rè khi tăng âm lượng.", "INTERNAL", 350000, 1, "U08", "", "LOW", ""),
    ("CSVC-001", "AV_EQUIPMENT", "Máy chiếu phòng C101 không nhận HDMI", "Máy chiếu không nhận tín hiệu từ laptop qua cổng HDMI.", "INTERNAL", 250000, 1, "U08", "", "MEDIUM", ""),
    ("CSVC-002", "AV_EQUIPMENT", "Máy chiếu phòng C202 hỏng bo nguồn", "Máy chiếu không lên nguồn, có mùi khét nhẹ ở bo nguồn.", "EXTERNAL", 2800000, 8, "U03", BAO_HANH, "HIGH", "late"),
    ("CSVC-010", "FURNITURE", "Thay 6 ghế gãy phòng E201", "6 ghế sinh viên gãy chân, không ngồi được.", "INTERNAL", 1500000, 2, "U10", "", "MEDIUM", ""),
    ("CSVC-010", "FURNITURE", "Mua mới 10 bộ bàn ghế phòng E201", "10 bộ bàn ghế xuống cấp, mặt bàn nứt, ốc vít rỉ sét.", "EXTERNAL", 9500000, 12, "U10", THANH_CONG, "MEDIUM", "reject"),
    ("CSVC-002", "FURNITURE", "Bảng viết phòng C202 bong tróc", "Bề mặt bảng bong tróc, viết phấn khó đọc.", "INTERNAL", 800000, 1, "U10", "", "LOW", ""),
    ("CSVC-010", "FURNITURE", "Gia cố chân bàn phòng E201", "Một số bàn lung lay, cần gia cố chân.", "INTERNAL", 300000, 1, "U03", "", "LOW", ""),
    ("CSVC-009", "BUILDING", "Cửa phòng A302 kẹt bản lề", "Cửa đóng mở bị kẹt, phát ra tiếng kêu.", "INTERNAL", 200000, 1, "U10", "", "MEDIUM", ""),
    ("CSVC-009", "BUILDING", "Thay ổ khóa cửa phòng A302", "Ổ khóa cửa hỏng, không khóa được phòng sau giờ học.", "INTERNAL", 450000, 1, "U03", "", "MEDIUM", ""),
    ("CSVC-004", "BUILDING", "Trần thạch cao phòng F102 thấm nước", "Trần thạch cao ố vàng, võng xuống sau mưa lớn.", "EXTERNAL", 3800000, 6, "U10", HOANG_LONG, "HIGH", ""),
    ("CSVC-004", "BUILDING", "Cửa kính phòng F102 nứt", "Cửa kính ra vào nứt dài, nguy cơ vỡ.", "EXTERNAL", 2400000, 3, "U10", HOANG_LONG, "URGENT", ""),
    ("CSVC-001", "BUILDING", "Sơn lại tường phòng C101 bong tróc", "Tường cuối phòng bong sơn, mất thẩm mỹ.", "INTERNAL", 1200000, 2, "U10", "", "LOW", ""),
    ("CSVC-005", "ELECTRICAL", "Thay 12 bóng đèn LED hành lang tầng 2 Khu C", "Thay bóng tuýp cũ bằng LED tiết kiệm điện ở nửa dãy hành lang.", "INTERNAL", 2400000, 2, "U07", "", "MEDIUM", ""),
    ("CSVC-006", "HVAC", "Điều hòa C101 bảo dưỡng định kỳ", "Vệ sinh, kiểm tra gas định kỳ trước mùa nóng.", "EXTERNAL", 1500000, 2, "U07", SONG_HAN, "LOW", ""),
    ("CSVC-012", "ELECTRICAL", "Dây điện ổ cắm phòng D301 nóng", "Dây điện âm tường tại ổ cắm nóng bất thường khi dùng máy chiếu.", "INTERNAL", 500000, 1, "U07", "", "URGENT", ""),
    ("CSVC-003", "NETWORK_IT", "Máy in phòng máy E301 kẹt giấy liên tục", "Máy in kẹt giấy, cần vệ sinh trục cuốn.", "INTERNAL", 200000, 1, "U08", "", "LOW", ""),
    ("CSVC-008", "SANITATION", "Khu vệ sinh tầng 1 Khu A có mùi hôi", "Mùi hôi từ hố ga thoát sàn khu vệ sinh.", "INTERNAL", 300000, 1, "U09", "", "MEDIUM", ""),
    ("CSVC-011", "NETWORK_IT", "Camera hành lang Khu E mất tín hiệu", "3 camera hành lang không lên hình trên đầu ghi.", "EXTERNAL", 3500000, 4, "U08", MANG_MT, "MEDIUM", ""),
    ("CSVC-004", "HVAC", "Điều hòa phòng F102 không lạnh", "Điều hòa phòng làm việc F102 chạy nhưng không lạnh, có tiếng kêu.", "EXTERNAL", 2100000, 4, "U07", HOA_KHANH, "MEDIUM", "fail"),
    ("CSVC-003", "HVAC", "Thay tụ điều hòa phòng máy E301", "Điều hòa phòng máy không khởi động được block.", "EXTERNAL", 1600000, 3, "U07", HOA_KHANH, "HIGH", "late"),
]

# Tình huống demo: AI cần phát hiện điều "không ổn" để thể hiện vai trò hỗ trợ quyết định.
DEMO_CASES = [
    {
        # Người gửi chọn "Xử lý sau" nhưng mô tả có dấu hiệu cháy -> AI nâng lên URGENT.
        "code": "YC-8101", "facility": "CSVC-003", "status": "NEW", "priority": "LOW",
        "title": "Ổ điện bàn số 5 phòng máy E301 có mùi khét",
        "description": "Ổ điện ở bàn số 5 có mùi khét, thỉnh thoảng thấy tia lửa khi cắm sạc laptop. Sinh viên vẫn đang dùng phòng.",
        "location": "Tầng 3, Phòng 301", "requester": "U06", "hours_ago": 2,
    },
    {
        # Trùng với YC-9001 (cùng điều hòa C101 đang mở) -> AI cảnh báo trùng lặp.
        "code": "YC-8102", "facility": "CSVC-006", "status": "NEW", "priority": "MEDIUM",
        "title": "Điều hòa phòng C101 không mát",
        "description": "Điều hòa phòng C101 bật lên nhưng không mát, lớp học buổi chiều rất nóng.",
        "location": "Tầng 1, Phòng 101", "requester": "U06", "hours_ago": 5,
    },
    {
        # Đã tiếp nhận, chưa phân công -> AI phân công đúng tổ CNTT (Nguyễn Quốc Bảo).
        "code": "YC-8103", "facility": "CSVC-011", "status": "ACCEPTED", "priority": "HIGH",
        "title": "Wifi tầng 3 Khu E chập chờn",
        "description": "Wifi tầng 3 Khu E mất kết nối liên tục từ sáng, sinh viên không làm bài kiểm tra trực tuyến được.",
        "location": "Tầng 3, hành lang", "requester": "U01", "hours_ago": 20, "category": "NETWORK_IT",
    },
    {
        # Chờ phương án: vấn đề nước đơn giản -> AI đề xuất sửa nội bộ, giao tổ nước.
        "code": "YC-8104", "facility": "CSVC-008", "status": "WAITING_FOR_PLAN", "priority": "HIGH",
        "title": "Bồn cầu khu vệ sinh nam tầng 1 Khu A bị tắc và rò nước",
        "description": "Bồn cầu số 1 bị tắc, chân bồn rò nước ra sàn gây trơn trượt.",
        "location": "Tầng 1, khu vệ sinh", "requester": "U01", "hours_ago": 30, "category": "PLUMBING",
        "staff": "U09",
        "survey": {
            "findings": "Ống xả bồn cầu bị tắc do vật lạ; gioăng chân bồn lão hóa gây rò.",
            "root_cause": "Sử dụng sai cách và gioăng cao su hết hạn sử dụng.",
            "damage_level": "Trung bình",
            "recommended_action": "Thông tắc ống xả, thay gioăng chân bồn cầu.",
            "estimated_time": "3 giờ",
            "estimated_cost": 450000,
        },
    },
    {
        # Chờ BGH duyệt: dự toán cao hơn 50% so với khảo sát -> AI khuyến nghị trả lại điều chỉnh.
        "code": "YC-8105", "facility": "CSVC-002", "status": "WAITING_FOR_APPROVAL", "priority": "HIGH",
        "title": "Thay mới 2 máy điều hòa phòng C202",
        "description": "Hai máy điều hòa phòng C202 hỏng nhiều lần, không đáp ứng giảng dạy mùa nóng.",
        "location": "Tầng 2, Phòng 202", "requester": "U01", "hours_ago": 50, "category": "HVAC",
        "staff": "U07",
        "survey": {
            "findings": "Hai máy đã sử dụng 11 năm, một máy hỏng block đã sửa 1 lần, máy còn lại rò gas.",
            "root_cause": "Thiết bị hết tuổi thọ.",
            "damage_level": "Nặng",
            "recommended_action": "Thay mới 2 máy điều hòa inverter 2HP.",
            "estimated_time": "10 ngày",
            "estimated_cost": 30000000,
        },
        "plan": {
            "title": "Mua mới và lắp đặt 2 máy điều hòa 2HP phòng C202",
            "repair_type": "EXTERNAL", "cost": 45000000, "duration": "10 ngày",
            "materials": "2 máy điều hòa 2HP, ống đồng, giá đỡ, công lắp đặt",
        },
    },
    {
        # Đã duyệt thuê ngoài, chưa chọn nhà thầu -> AI so sánh 2 nhà thầu điện lạnh cho BP Mua sắm.
        "code": "YC-8106", "facility": "CSVC-003", "status": "WAITING_FOR_EXTERNAL_WORK", "priority": "HIGH",
        "title": "Thay block máy điều hòa phòng máy E301",
        "description": "Điều hòa phòng máy E301 hỏng block, phòng nóng làm máy tính tự tắt.",
        "location": "Tầng 3, Phòng 301", "requester": "U01", "hours_ago": 70, "category": "HVAC",
        "staff": "U07",
        "survey": {
            "findings": "Block máy nén không chạy, đã thay tụ nhưng không khắc phục được.",
            "root_cause": "Block máy nén hỏng sau thời gian dài vận hành liên tục.",
            "damage_level": "Nặng",
            "recommended_action": "Thay block máy nén và nạp lại gas.",
            "estimated_time": "4 ngày",
            "estimated_cost": 5200000,
        },
        "plan": {
            "title": "Thuê ngoài thay block máy nén điều hòa phòng E301",
            "repair_type": "EXTERNAL", "cost": 5500000, "duration": "4 ngày",
            "materials": "Block máy nén, gas lạnh, công thay thế", "approved": True,
        },
        "work": True,
    },
]
