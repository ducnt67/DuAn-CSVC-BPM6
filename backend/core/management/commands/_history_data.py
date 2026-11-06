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
THANG_MAY = "Công ty TNHH Thang máy Đà Nẵng"

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
    # Lịch sử cho các CSVC bổ sung (hội trường, thư viện, thang máy).
    ("CSVC-013", "HVAC", "Vệ sinh 4 máy điều hòa hội trường Khu A", "Bảo dưỡng định kỳ 4 máy điều hòa âm trần hội trường trước lễ khai giảng.", "EXTERNAL", 2400000, 2, "U07", SONG_HAN, "LOW", ""),
    ("CSVC-013", "AV_EQUIPMENT", "Micro không dây hội trường bị rè", "2 micro không dây hội trường rè và mất tiếng khi đi xa bục.", "EXTERNAL", 1800000, 5, "U08", BAO_HANH, "MEDIUM", ""),
    ("CSVC-014", "ELECTRICAL", "Đèn bàn đọc thư viện chập chờn", "Dãy đèn khu bàn đọc tầng 2 thư viện chập chờn.", "INTERNAL", 500000, 1, "U07", "", "MEDIUM", ""),
    ("CSVC-014", "HVAC", "Điều hòa thư viện chảy nước", "Dàn lạnh điều hòa khu đọc sách nhỏ nước xuống kệ sách.", "EXTERNAL", 1400000, 3, "U07", HOA_KHANH, "HIGH", "late"),
    ("CSVC-015", "OTHER", "Bảo trì định kỳ thang máy Khu E", "Bảo trì 6 tháng: kiểm tra cáp, phanh, cửa tầng thang máy.", "EXTERNAL", 3000000, 1, "U10", THANG_MAY, "MEDIUM", ""),
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
    # ================= Bộ ca thử bổ sung: mỗi vai trò có 2-6 ca để thử AI =================
    # --- Quản trị CSVC (tqhuy): phân loại & đánh giá mức độ yêu cầu MỚI ---
    {
        # Nước dột chảy xuống ổ cắm -> nguy cơ chập điện; liên quan YC-8122 (chống thấm F102 đang chờ duyệt).
        "code": "YC-8107", "facility": "CSVC-004", "status": "NEW", "priority": "MEDIUM",
        "title": "Trần phòng F102 dột nước xuống ổ cắm",
        "description": "Sau trận mưa sáng nay trần phòng làm việc F102 nhỏ nước, nước chảy theo tường xuống ổ cắm gần máy in. Phòng vẫn đang làm việc bình thường.",
        "location": "Tầng 1, Phòng 102", "requester": "U01", "hours_ago": 1,
    },
    {
        # Người gửi chọn "Rất khẩn cấp" cho lỗi nhỏ -> AI đề xuất hạ mức độ.
        "code": "YC-8108", "facility": "CSVC-001", "status": "NEW", "priority": "URGENT",
        "title": "Bàn giảng viên phòng C101 hơi lung lay",
        "description": "Bàn giảng viên hơi lung lay khi tì tay viết bảng, vẫn sử dụng được. Nhờ phòng kiểm tra khi tiện.",
        "location": "Tầng 1, Phòng 101", "requester": "U06", "hours_ago": 3,
    },
    {
        # Máy chiếu từng thay bóng (lịch sử) nay lại mờ, sắp có bảo vệ khóa luận -> AI nhận ra sự cố lặp lại.
        "code": "YC-8109", "facility": "CSVC-007", "status": "NEW", "priority": "MEDIUM",
        "title": "Máy chiếu phòng D201 lại bị mờ, có vệt vàng",
        "description": "Máy chiếu phòng D201 hình chiếu mờ và có vệt vàng ở góc, giống lần hỏng trước. Thứ Hai tuần sau phòng có lịch bảo vệ khóa luận.",
        "location": "Tầng 2, Phòng 201", "requester": "U01", "hours_ago": 4,
    },
    {
        # Mô tả quá chung chung -> AI đề xuất yêu cầu bổ sung thông tin kèm câu hỏi cụ thể.
        "code": "YC-8110", "facility": "CSVC-002", "status": "NEW", "priority": "MEDIUM",
        "title": "Phòng C202 có vấn đề",
        "description": "Phòng học có vấn đề, nhờ phòng CSVC kiểm tra giúp.",
        "location": "Tầng 2, Phòng 202", "requester": "U06", "hours_ago": 6,
    },
    {
        # Trùng sự cố với YC-8103 (wifi tầng 3 Khu E đang xử lý) -> AI cảnh báo trùng lặp.
        "code": "YC-8111", "facility": "CSVC-011", "status": "NEW", "priority": "HIGH",
        "title": "Không vào được wifi ở tầng 3 Khu E",
        "description": "Cả lớp không kết nối được wifi tầng 3 Khu E, điện thoại báo có sóng nhưng không vào mạng.",
        "location": "Tầng 3, hành lang", "requester": "U06", "hours_ago": 8,
    },
    {
        # Có người bị kẹt trong thang máy -> an toàn con người, AI nâng lên Rất khẩn cấp; loại "Khác".
        "code": "YC-8112", "facility": "CSVC-015", "status": "NEW", "priority": "MEDIUM",
        "title": "Thang máy Khu E dừng giữa tầng 2 và 3",
        "description": "Thang máy Khu E đột ngột dừng giữa tầng 2 và 3, có 3 sinh viên bị kẹt khoảng 10 phút mới mở được cửa. Hiện thang vẫn đang chạy.",
        "location": "Sảnh tầng 1", "requester": "U06", "hours_ago": 0.5,
    },
    # --- Quản trị CSVC: phân công người khảo sát theo chuyên môn & khối lượng việc ---
    {
        # Nội thất -> AI chọn tổ Xây dựng - Nội thất (Phạm Minh Khoa).
        "code": "YC-8113", "facility": "CSVC-010", "status": "ACCEPTED", "priority": "MEDIUM",
        "title": "8 ghế phòng E201 gãy tựa lưng",
        "description": "8 ghế sinh viên dãy cuối phòng E201 gãy tựa lưng, có ốc vít lòi ra dễ gây xước tay.",
        "location": "Tầng 2, Phòng 201", "requester": "U01", "hours_ago": 12, "category": "FURNITURE",
    },
    {
        # Điện -> AI chọn tổ Điện (Trần Văn Dũng); lịch sử từng có ca aptomat F102 tương tự.
        "code": "YC-8114", "facility": "CSVC-004", "status": "ACCEPTED", "priority": "HIGH",
        "title": "Aptomat phòng F102 nhảy khi bật điều hòa",
        "description": "Mỗi lần bật điều hòa cùng máy photocopy thì aptomat phòng F102 nhảy, mất điện cả phòng làm việc.",
        "location": "Tầng 1, Phòng 102", "requester": "U01", "hours_ago": 16, "category": "ELECTRICAL",
    },
    # --- Cán bộ kỹ thuật: AI gợi ý khi khảo sát (đăng nhập đúng cán bộ được giao) ---
    {
        "code": "YC-8115", "facility": "CSVC-008", "status": "SURVEYING", "priority": "HIGH",
        "title": "Ống thoát lavabo khu vệ sinh nữ tầng 1 Khu A rò nước",
        "description": "Nước rò từ ống thoát dưới lavabo, sàn khu vệ sinh nữ luôn ướt và có mùi.",
        "location": "Tầng 1, khu vệ sinh", "requester": "U06", "hours_ago": 18, "category": "PLUMBING",
        "staff": "U09",
    },
    {
        "code": "YC-8116", "facility": "CSVC-003", "status": "SURVEYING", "priority": "HIGH",
        "title": "Phòng máy E301: 4 máy không vào mạng",
        "description": "4 máy dãy giữa phòng E301 không vào được mạng LAN, các máy khác bình thường. Chiều mai có lớp thực hành.",
        "location": "Tầng 3, Phòng 301", "requester": "U01", "hours_ago": 10, "category": "NETWORK_IT",
        "staff": "U08",
    },
    {
        "code": "YC-8117", "facility": "CSVC-009", "status": "SURVEYING", "priority": "MEDIUM",
        "title": "Cửa phòng A302 lại kẹt, khóa khó xoay",
        "description": "Cửa phòng A302 phải đẩy mạnh mới đóng được, chìa khóa khó xoay, sợ gãy chìa trong ổ.",
        "location": "Tầng 3, Phòng 302", "requester": "U01", "hours_ago": 22, "category": "BUILDING",
        "staff": "U03",
    },
    # --- Quản trị CSVC: lập phương án từ kết quả khảo sát ---
    {
        # Chi phí vượt hạn mức nội bộ -> AI đề xuất thuê ngoài, cần BGH duyệt.
        "code": "YC-8118", "facility": "CSVC-011", "status": "WAITING_FOR_PLAN", "priority": "HIGH",
        "title": "Switch tầng 2 Khu E hỏng nhiều cổng",
        "description": "Nhiều phòng tầng 2 Khu E mất mạng từng lúc, đèn cổng switch nhấp nháy bất thường.",
        "location": "Tầng 2, tủ mạng", "requester": "U01", "hours_ago": 40, "category": "NETWORK_IT",
        "staff": "U08",
        "survey": {
            "findings": "Switch 24 cổng hỏng 9 cổng, nguồn switch nóng; thiết bị đã dùng hơn 8 năm.",
            "root_cause": "Thiết bị hết tuổi thọ, tủ mạng không có quạt tản nhiệt.",
            "damage_level": "Nặng",
            "recommended_action": "Thay switch mới 24 cổng và lắp quạt tản nhiệt cho tủ mạng.",
            "estimated_time": "3 ngày",
            "estimated_cost": 6200000,
        },
    },
    {
        # Việc nhỏ, chi phí thấp -> AI đề xuất sửa nội bộ, không cần BGH duyệt.
        "code": "YC-8119", "facility": "CSVC-005", "status": "WAITING_FOR_PLAN", "priority": "MEDIUM",
        "title": "Thay 8 bóng đèn LED hành lang tầng 2 Khu C",
        "description": "8 bóng đèn cuối hành lang tầng 2 Khu C không sáng, hành lang tối khi tan học buổi tối.",
        "location": "Tầng 2, hành lang", "requester": "U01", "hours_ago": 36, "category": "ELECTRICAL",
        "staff": "U07",
        "survey": {
            "findings": "8 bóng LED tuýp cháy, máng đèn và dây dẫn còn tốt.",
            "root_cause": "Bóng hết tuổi thọ.",
            "damage_level": "Nhẹ",
            "recommended_action": "Thay 8 bóng LED tuýp 1m2 cùng loại.",
            "estimated_time": "2 giờ",
            "estimated_cost": 1600000,
        },
    },
    # --- Ban Giám hiệu (nttha): phê duyệt phương án ---
    {
        # Dự toán sát khảo sát và lịch sử -> AI khuyến nghị duyệt.
        "code": "YC-8120", "facility": "CSVC-007", "status": "WAITING_FOR_APPROVAL", "priority": "HIGH",
        "title": "Thay bóng đèn chiếu máy chiếu phòng D201",
        "description": "Máy chiếu phòng D201 rất mờ, giảng viên phải tắt đèn phòng mới nhìn được.",
        "location": "Tầng 2, Phòng 201", "requester": "U01", "hours_ago": 60, "category": "AV_EQUIPMENT",
        "staff": "U08",
        "survey": {
            "findings": "Bóng đèn chiếu đã chạy hơn 4.000 giờ, độ sáng còn khoảng 40%.",
            "root_cause": "Bóng đèn chiếu hết tuổi thọ.",
            "damage_level": "Trung bình",
            "recommended_action": "Thay bóng đèn chiếu chính hãng qua trung tâm bảo hành.",
            "estimated_time": "5 ngày",
            "estimated_cost": 3200000,
        },
        "plan": {
            "title": "Thay bóng đèn chiếu chính hãng cho máy chiếu D201",
            "repair_type": "EXTERNAL", "cost": 3300000, "duration": "5 ngày",
            "materials": "Bóng đèn chiếu chính hãng, công thay và cân chỉnh",
        },
    },
    {
        # Dự toán gần gấp đôi khảo sát, khảo sát chỉ cần thay 7/12 bộ -> AI khuyến nghị trả lại điều chỉnh.
        "code": "YC-8121", "facility": "CSVC-010", "status": "WAITING_FOR_APPROVAL", "priority": "MEDIUM",
        "title": "Mua mới 12 bộ bàn ghế phòng E201",
        "description": "Nhiều bộ bàn ghế phòng E201 xuống cấp, mặt bàn nứt, chân ghế lung lay.",
        "location": "Tầng 2, Phòng 201", "requester": "U01", "hours_ago": 75, "category": "FURNITURE",
        "staff": "U10",
        "survey": {
            "findings": "12 bộ bàn ghế xuống cấp, trong đó 5 bộ có thể gia cố thay vì thay mới.",
            "root_cause": "Hao mòn sau nhiều năm sử dụng.",
            "damage_level": "Trung bình",
            "recommended_action": "Thay mới 7 bộ hỏng nặng, gia cố 5 bộ còn lại.",
            "estimated_time": "12 ngày",
            "estimated_cost": 9800000,
        },
        "plan": {
            "title": "Mua mới 12 bộ bàn ghế gỗ cao cấp phòng E201",
            "repair_type": "EXTERNAL", "cost": 18500000, "duration": "15 ngày",
            "materials": "12 bộ bàn ghế gỗ cao cấp, vận chuyển, lắp đặt",
        },
    },
    {
        # Trần F102 từng chống thấm (lịch sử, Hoàng Long) nay thấm lại -> AI lưu ý sự cố lặp lại / bảo hành.
        "code": "YC-8122", "facility": "CSVC-004", "status": "WAITING_FOR_APPROVAL", "priority": "HIGH",
        "title": "Xử lý chống thấm lại trần phòng F102",
        "description": "Trần thạch cao phòng F102 lại ố vàng và võng xuống sau các đợt mưa lớn.",
        "location": "Tầng 1, Phòng 102", "requester": "U01", "hours_ago": 55, "category": "BUILDING",
        "staff": "U10",
        "survey": {
            "findings": "Lớp chống thấm sê nô mái phía trên phòng F102 bong tróc, 3 tấm trần thạch cao ngấm nước.",
            "root_cause": "Lớp chống thấm cũ xuống cấp; khu vực này đã từng chống thấm một lần.",
            "damage_level": "Trung bình",
            "recommended_action": "Chống thấm lại sê nô mái và thay 3 tấm trần thạch cao.",
            "estimated_time": "6 ngày",
            "estimated_cost": 4000000,
        },
        "plan": {
            "title": "Thuê ngoài chống thấm sê nô mái và thay trần thạch cao F102",
            "repair_type": "EXTERNAL", "cost": 4200000, "duration": "6 ngày",
            "materials": "Vật liệu chống thấm, 3 tấm thạch cao, công thi công",
        },
    },
    # --- BP Mua sắm (pvbinh): chọn nhà thầu cho việc đã duyệt ---
    {
        # Nhà thầu nước duy nhất (Hải Vân) từng nghiệm thu không đạt -> AI nêu rủi ro, đề xuất điều kiện bảo hành.
        "code": "YC-8123", "facility": "CSVC-008", "status": "WAITING_FOR_EXTERNAL_WORK", "priority": "HIGH",
        "title": "Sửa đường ống cấp nước âm tường khu vệ sinh nam tầng 1 Khu A",
        "description": "Tường khu vệ sinh nam ẩm mốc, đồng hồ nước vẫn quay khi đã khóa hết vòi.",
        "location": "Tầng 1, khu vệ sinh", "requester": "U01", "hours_ago": 90, "category": "PLUMBING",
        "staff": "U09",
        "survey": {
            "findings": "Rò rỉ tại đoạn ống PPR âm tường phía sau bồn rửa, tường ngấm nước khoảng 2m2.",
            "root_cause": "Mối hàn ống PPR bị nứt sau thời gian dài sử dụng.",
            "damage_level": "Nặng",
            "recommended_action": "Đục tường, thay đoạn ống rò và hoàn trả mặt tường.",
            "estimated_time": "4 ngày",
            "estimated_cost": 4300000,
        },
        "plan": {
            "title": "Thuê ngoài thay đoạn ống cấp nước âm tường khu vệ sinh nam",
            "repair_type": "EXTERNAL", "cost": 4500000, "duration": "4 ngày",
            "materials": "Ống PPR, phụ kiện, vật liệu hoàn trả tường, công thi công", "approved": True,
        },
        "work": True,
    },
    {
        # Nhà thầu mạng (Mạng miền Trung) vừa có ca tốt vừa có ca không đạt / trễ hạn -> AI cân nhắc.
        "code": "YC-8124", "facility": "CSVC-011", "status": "WAITING_FOR_EXTERNAL_WORK", "priority": "MEDIUM",
        "title": "Thay 4 camera an ninh hành lang tầng 1 Khu E",
        "description": "4 camera hành lang tầng 1 Khu E hình nhòe, ban đêm không nhìn rõ.",
        "location": "Tầng 1, hành lang", "requester": "U01", "hours_ago": 100, "category": "NETWORK_IT",
        "staff": "U08",
        "survey": {
            "findings": "4 camera analog cũ hỏng hồng ngoại, đầu ghi còn tốt.",
            "root_cause": "Camera hết tuổi thọ.",
            "damage_level": "Trung bình",
            "recommended_action": "Thay 4 camera IP có hồng ngoại, tận dụng đầu ghi hiện có.",
            "estimated_time": "3 ngày",
            "estimated_cost": 6000000,
        },
        "plan": {
            "title": "Thuê ngoài thay 4 camera IP hành lang tầng 1 Khu E",
            "repair_type": "EXTERNAL", "cost": 6400000, "duration": "3 ngày",
            "materials": "4 camera IP hồng ngoại, dây cáp, công lắp đặt", "approved": True,
        },
        "work": True,
    },
    # --- Quản trị CSVC: phân công người nghiệm thu khi thuê ngoài đang thi công ---
    {
        "code": "YC-8125", "facility": "CSVC-013", "status": "EXTERNAL_WORK_IN_PROGRESS", "priority": "MEDIUM",
        "title": "Bảo dưỡng và nạp gas 4 máy điều hòa hội trường Khu A",
        "description": "4 máy điều hòa hội trường làm lạnh yếu, cần xử lý trước hội nghị khoa học cuối tháng.",
        "location": "Tầng 1, Hội trường", "requester": "U01", "hours_ago": 120, "category": "HVAC",
        "staff": "U07",
        "survey": {
            "findings": "Dàn lạnh bám bụi dày, 2 máy thiếu gas.",
            "root_cause": "Lâu chưa bảo dưỡng định kỳ.",
            "damage_level": "Trung bình",
            "recommended_action": "Vệ sinh 4 máy, nạp bổ sung gas cho 2 máy thiếu.",
            "estimated_time": "3 ngày",
            "estimated_cost": 3600000,
        },
        "plan": {
            "title": "Thuê ngoài bảo dưỡng và nạp gas 4 máy điều hòa hội trường",
            "repair_type": "EXTERNAL", "cost": 3800000, "duration": "3 ngày",
            "materials": "Gas lạnh, hóa chất vệ sinh, công bảo dưỡng", "approved": True,
        },
        "work": {"contractor": SONG_HAN, "progress": 40, "status": "IN_PROGRESS",
                 "notes": "Đã vệ sinh 2/4 máy, chờ nạp gas."},
    },
    # --- Cán bộ nghiệm thu: AI soạn checklist nghiệm thu ---
    {
        # Nhà thầu Hòa Khánh từng nghiệm thu không đạt & trễ hạn -> checklist kỹ hơn. Đăng nhập tvdung.
        "code": "YC-8126", "facility": "CSVC-014", "status": "WAITING_FOR_ACCEPTANCE", "priority": "HIGH",
        "title": "Thay tụ và quạt dàn nóng điều hòa thư viện Khu B",
        "description": "Điều hòa khu đọc sách thư viện chạy một lúc thì ngắt, phòng rất nóng.",
        "location": "Tầng 2, Phòng đọc", "requester": "U01", "hours_ago": 150, "category": "HVAC",
        "staff": "U07",
        "survey": {
            "findings": "Tụ khởi động phồng, quạt dàn nóng quay yếu làm block quá nhiệt.",
            "root_cause": "Linh kiện xuống cấp, dàn nóng đặt nơi bí gió.",
            "damage_level": "Trung bình",
            "recommended_action": "Thay tụ, thay quạt dàn nóng, kiểm tra gas.",
            "estimated_time": "2 ngày",
            "estimated_cost": 1900000,
        },
        "plan": {
            "title": "Thuê ngoài thay tụ và quạt dàn nóng điều hòa thư viện",
            "repair_type": "EXTERNAL", "cost": 2000000, "duration": "2 ngày",
            "materials": "Tụ khởi động, quạt dàn nóng, gas bổ sung", "approved": True,
        },
        "work": {"contractor": HOA_KHANH, "progress": 100, "status": "WAITING_ACCEPTANCE",
                 "result": "Đã thay tụ khởi động và quạt dàn nóng, nạp bổ sung gas."},
    },
    {
        # Người nghiệm thu (Lê Hoàng Nam) khác người khảo sát (Nguyễn Quốc Bảo). Đăng nhập lhnam.
        "code": "YC-8127", "facility": "CSVC-013", "status": "WAITING_FOR_ACCEPTANCE", "priority": "MEDIUM",
        "title": "Sửa hệ thống loa và micro hội trường Khu A",
        "description": "Loa hội trường rè, 1 micro không dây mất tín hiệu giữa buổi lễ.",
        "location": "Tầng 1, Hội trường", "requester": "U01", "hours_ago": 140, "category": "AV_EQUIPMENT",
        "staff": "U08", "inspector": "U03",
        "survey": {
            "findings": "Mixer hỏng 2 kênh, 1 bộ thu micro không dây hỏng.",
            "root_cause": "Thiết bị âm thanh xuống cấp.",
            "damage_level": "Trung bình",
            "recommended_action": "Sửa mixer, thay bộ thu micro không dây.",
            "estimated_time": "5 ngày",
            "estimated_cost": 2600000,
        },
        "plan": {
            "title": "Thuê ngoài sửa mixer và thay bộ thu micro hội trường",
            "repair_type": "EXTERNAL", "cost": 2700000, "duration": "5 ngày",
            "materials": "Linh kiện mixer, bộ thu micro không dây", "approved": True,
        },
        "work": {"contractor": BAO_HANH, "progress": 100, "status": "WAITING_ACCEPTANCE",
                 "result": "Đã sửa mixer và thay bộ thu micro không dây."},
    },
]
