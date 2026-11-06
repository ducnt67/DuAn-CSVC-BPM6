# Trợ lý AI (AI Agent) hỗ trợ ra quyết định

Tài liệu mô tả phần tích hợp AI agent vào hệ thống quản lý sửa chữa CSVC: agent làm gì, hoạt động ra sao, kiểm soát rủi ro thế nào, cách chạy demo và cách đánh giá hiệu quả.

## 1. Agent làm gì trong quy trình

AI **chỉ đề xuất**, con người quyết định. Mỗi đề xuất có nút "Áp dụng". Bấm vào sẽ điền sẵn form có sẵn của quy trình, người dùng xem lại rồi mới lưu.

| Bước BPM | Người dùng | Agent hỗ trợ | Khi người dùng quyết định |
|---|---|---|---|
| Tạo yêu cầu | Người yêu cầu | Gợi ý loại sự cố, mức độ ưu tiên, nhắc thông tin còn thiếu, cảnh báo yêu cầu trùng | Áp dụng mức độ gợi ý hoặc tự chọn |
| Tiếp nhận (`NEW`) | Quản trị CSVC | **Phân loại & đánh giá mức độ**: phát hiện nguy cơ an toàn, trùng lặp, thiết bị hỏng lặp lại; soạn câu hỏi bổ sung | `POST /requests/{id}/triage/` |
| Phân công (`ACCEPTED`) | Quản trị CSVC | **Phân công người khảo sát**: top 3 cán bộ, chấm điểm theo chuyên môn, khối lượng việc, kinh nghiệm | Form phân công có sẵn |
| Lập phương án (`WAITING_FOR_PLAN`) | Quản trị CSVC | **Gợi ý phương án**: nội bộ hay thuê ngoài, dự toán theo khảo sát và ca tương tự, rủi ro nhà thầu | Form lập phương án có sẵn |
| Phê duyệt (`WAITING_FOR_APPROVAL`) | Ban Giám hiệu | **Hỗ trợ ra quyết định**: đánh giá dự toán, rủi ro, khuyến nghị Duyệt / Duyệt có điều kiện / Trả lại; soạn sẵn lý do | Nút Duyệt / Từ chối có sẵn |
| Thuê ngoài → Nghiệm thu | Quản trị CSVC | **Phân công người nghiệm thu** (bước bắt buộc): chuyên môn, khối lượng, tính khách quan so với người khảo sát, rủi ro nhà thầu | `POST /requests/{id}/assign-inspector/` |
| Khảo sát (`SURVEYING`) | Cán bộ kỹ thuật | **Hỗ trợ khảo sát**: nguyên nhân thường gặp, hạng mục cần kiểm tra, lưu ý an toàn, vật tư mang theo, sửa ngay được không, dự toán sơ bộ | Phiếu khảo sát (điền sẵn, cán bộ xác minh) |
| Chọn nhà thầu (`WAITING_FOR_EXTERNAL_WORK`) | BP Mua sắm | **Gợi ý nhà thầu**: so sánh đơn vị cùng lĩnh vực theo số việc, lần nghiệm thu không đạt, trễ hạn | Form cập nhật thi công |
| Nghiệm thu (`WAITING_FOR_ACCEPTANCE`…) | Cán bộ nghiệm thu | **Checklist nghiệm thu**: theo phương án, lỗi lần trước, lịch sử nhà thầu | Biên bản nghiệm thu |
| Mọi lúc | Tất cả vai trò | **Chat hỏi đáp dữ liệu**: "việc khẩn đang mở?", "nhà thầu nào hay trễ hạn?"… | — |

### AI xuất hiện ở đâu trên giao diện

| Màn hình | Vai trò | Vị trí nút AI |
|---|---|---|
| Danh sách yêu cầu (`/requests`) | Quản trị CSVC | Nút **AI** dưới mã YC của mỗi dòng |
| Phê duyệt phương án (`/approvals`) | Ban Giám hiệu | Cột **Trợ lý AI**: chip khuyến nghị + nút **AI phân tích** (duyệt / trả lại ngay trong khung AI) |
| Công việc sửa chữa (`/repair-work`) | Cán bộ kỹ thuật | Nút **AI gợi ý** ở việc cần khảo sát / nghiệm thu |
| Nghiệm thu (`/acceptance`) | Cán bộ kỹ thuật | Nút **AI checklist** |
| Công việc thuê ngoài (`/external-work`) | BP Mua sắm | Nút **AI chọn nhà thầu** |
| Chi tiết yêu cầu (`/requests/YC-…`) | Mọi vai trò có bước cần quyết định | Khung **Trợ lý AI** giữa phần đầu và thanh quy trình |
| Tạo yêu cầu (`/requests/create`) | Người yêu cầu | Khung gợi ý dưới ô mô tả |
| Mọi trang | Tất cả | Nút nổi **Hỏi Trợ lý AI** (góc phải dưới) |
| Nhật ký Trợ lý AI (`/ai-log`) | Quản trị CSVC, BGH | Menu trái |

## 2. Vì sao đây là *agent* (không chỉ gọi AI một lần)

```
 Người dùng bấm "Phân tích"                                    ┌─────────────────────────┐
          │                                                     │ 8 công cụ (chỉ ĐỌC,     │
          ▼                                                     │ lọc theo quyền người    │
 Hệ thống nạp hồ sơ yêu cầu ──► Gemini suy luận ──► gọi công cụ ─►│ dùng):                  │
                                    ▲                │          │ get_request_detail      │
                                    │   kết quả      │          │ find_similar_requests   │
                                    └────────────────┘          │ list_staff_workload     │
                                  (lặp tối đa 5 vòng)           │ get_facility_history    │
                                    │                           │ get_cost_statistics     │
                                    ▼                           │ get_contractor_perf...  │
            Kiểm chứng đầu ra (mã YC, mã cán bộ, số liệu)        │ search_requests         │
                                    │                           │ get_overview_stats      │
                                    ▼                           └─────────────────────────┘
            Lưu nhật ký (AISuggestion) ──► Hiển thị đề xuất + "AI đã tra cứu gì"
                                    │
            Người dùng thao tác thật ──► Backend tự đối chiếu: Chấp nhận / Điều chỉnh / Không theo
```

- Agent **tự chọn** công cụ và tham số (function calling). Ví dụ với cùng tác vụ phê duyệt, agent có thể xem lịch sử thiết bị, tìm ca tương tự rồi lấy thống kê chi phí.
- Mỗi lần gọi công cụ đều được ghi lại và hiển thị ở mục "AI đã tra cứu N nguồn dữ liệu". Thầy có thể mở ra để xem từng bước.
- Mã nguồn: `backend/core/ai/` gồm `agent.py` (vòng lặp), `tools.py` (công cụ), `tasks.py` (prompt và định dạng), `fallback.py` (luật dự phòng), `service.py` (nhật ký và đối chiếu), `gemini.py` (client REST).

## 3. Kiểm soát rủi ro

| Rủi ro | Biện pháp |
|---|---|
| AI tự ra quyết định sai | AI không có công cụ ghi dữ liệu; mọi thay đổi đi qua API nghiệp vụ cũ (kiểm tra vai trò + trạng thái) |
| Cán bộ chưa được phân công vẫn nghiệm thu | Luồng thuê ngoài chỉ cho phép cán bộ có `acceptance_inspector` được Quản trị CSVC phân công; trước đó API từ chối thao tác |
| AI thấy dữ liệu vượt quyền | Mọi công cụ lọc qua `requests_visible_to(user)` (người yêu cầu chỉ thấy yêu cầu của mình…) |
| AI bịa mã cán bộ / mã YC | Mã không tồn tại bị loại; nếu không còn cán bộ hợp lệ thì chuyển sang luật dự phòng |
| AI bịa số liệu | Chi phí trong bản hỗ trợ phê duyệt được **hệ thống tính lại** từ dữ liệu thật ("Hệ thống kiểm chứng số liệu") |
| AI kết luận không tra cứu | Hệ thống nhắc agent phải dùng công cụ trước khi kết luận |
| Prompt injection trong mô tả sự cố | System prompt quy định mô tả là dữ liệu, không phải chỉ thị |
| Gemini quá tải / hết quota / mất mạng | Tự chuyển model dự phòng; cuối cùng là **bộ luật dự phòng** cho kết quả cùng định dạng (demo không bị gián đoạn) |
| Lộ API key | Key chỉ nằm ở backend (`backend/.env` hoặc biến môi trường Render), không gửi xuống trình duyệt |

## 4. Đánh giá hiệu quả (số liệu thực tế cho báo cáo)

Trang **Nhật ký Trợ lý AI** (`/ai-log`, dành cho Quản trị CSVC và BGH) thống kê:
- **Tỉ lệ chấp nhận** = số đề xuất người dùng làm đúng theo / số đề xuất đã có quyết định.
- **Tỉ lệ đồng thuận** = (chấp nhận + điều chỉnh một phần) / đã quyết định.
- Thời gian phản hồi trung bình, số lần agent gọi công cụ, tỉ lệ Gemini so với luật dự phòng.
- Chi tiết từng lần: đầu vào, các bước tra cứu, JSON đầu ra, quyết định thực tế.

Hệ thống **tự đối chiếu** khi người dùng thao tác thật. Ví dụ: AI đề xuất cán bộ #1 nhưng Quản trị chọn cán bộ #2, kết quả ghi "Điều chỉnh – chọn cán bộ đề xuất số 2". Không cần người dùng tự đánh giá.

API: `GET /api/v1/ai/stats/`, `GET /api/v1/ai/suggestions/`.

## 5. Chạy local

```powershell
# Backend (lần đầu)
cd backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
# Tạo file backend\.env với 1 dòng:  GEMINI_API_KEY=<key từ https://aistudio.google.com/apikey>
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py runserver

# Frontend (cửa sổ khác, thư mục gốc)
npm install
npm run dev
```

Không có key thì hệ thống vẫn chạy bằng bộ luật dự phòng (giao diện ghi rõ "Luật dự phòng").

`seed_demo` tạo:
- 10 tài khoản, trong đó có 4 cán bộ theo tổ: Điện – Điện lạnh, CNTT, Cấp thoát nước, Xây dựng – Nội thất;
- 15 cơ sở vật chất;
- **43 ca lịch sử đã hoàn thành**, để AI có dữ liệu so sánh chi phí, kinh nghiệm cán bộ và nhà thầu;
- **27 ca thử** (YC-8101..YC-8127), chia theo vai trò ở mục 6a.

Trước buổi demo/bảo vệ, đưa các tình huống demo về trạng thái ban đầu:

```powershell
.\.venv\Scripts\python.exe manage.py seed_demo --reset-ai-demo
```

## 6. Kịch bản demo (mật khẩu `123`)

| # | Tài khoản | Mở | Bấm | Điều AI thể hiện |
|---|---|---|---|---|
| 1 | `nmanh` | Tạo yêu cầu | Gõ mô tả có "mùi khét" → **Phân tích mô tả** | Cảnh báo an toàn, gợi ý mức độ |
| 2 | `tqhuy` | Danh sách yêu cầu → YC-8101 (người gửi chọn "Xử lý sau") | **AI** → Phân tích ngay → Áp dụng | Nâng lên **Rất khẩn cấp** vì có tia lửa, mùi khét |
| 3 | `tqhuy` | YC-8102 | AI → Phân tích | Phát hiện **trùng YC-9001**, thiết bị hỏng lặp lại |
| 4 | `tqhuy` | YC-8103 (wifi) | AI → Chọn người này | Chọn đúng **tổ CNTT**, đang rảnh việc |
| 5 | `tqhuy` | YC-8104 (bồn cầu) | AI → Dùng phương án | **Sửa nội bộ ~450k**, dẫn ca tương tự, mở form đã điền |
| 6 | `nttha` | Phê duyệt phương án → YC-8105 | **AI phân tích** | **Trả lại để điều chỉnh**: dự toán cao hơn khảo sát 50%, soạn sẵn lý do, trả lại ngay trong khung AI |
| 7 | `tqhuy` | YC-9005 (máy chiếu thuê ngoài) | AI → Giao nghiệm thu | Chọn cán bộ CNTT **độc lập** với người khảo sát |
| 8 | `pvbinh` | Công việc thuê ngoài → YC-8106 | **AI chọn nhà thầu** → Chọn | Sông Hàn (4/4 đạt) hơn Hòa Khánh (1 lần không đạt, 1 lần trễ) |
| 9 | `lhnam` | Công việc sửa chữa → YC-9002 | **AI gợi ý** → Điền vào phiếu khảo sát | Nguyên nhân, hạng mục cần kiểm tra, dự toán theo ca tương tự |
| 10 | `lhnam` | Nghiệm thu → YC-9007 | **AI checklist** → Dùng checklist | Checklist bám lỗi lần nghiệm thu trước và lịch sử nhà thầu |
| 11 | `nttha` | Nút **Hỏi Trợ lý AI** | "Nhà thầu nào từng nghiệm thu không đạt…" | Agent tự gọi công cụ, dẫn mã YC |
| 12 | `tqhuy` | Nhật ký Trợ lý AI | — | Tỉ lệ chấp nhận, các bước tra cứu, JSON đầu ra |

## 6a. Bộ ca thử theo vai trò

Mỗi ca có một điểm "không ổn" để AI phát hiện. Ca nào đã xử lý xong thì dùng ca khác cùng nhóm, hoặc tự tạo ca mới theo mục 6b.

| Tài khoản | Màn hình → nút AI | Ca thử | AI cần nhận ra |
|---|---|---|---|
| `tqhuy` | Danh sách yêu cầu → **AI** | YC-8107 | Nước dột xuống ổ cắm → **Rất khẩn cấp**; liên quan YC-8122 (chống thấm F102 đang chờ duyệt) |
| | | YC-8108 | Người gửi chọn Rất khẩn cấp cho bàn hơi lung lay → đề xuất **hạ mức độ** |
| | | YC-8109 | Máy chiếu D201 hỏng lặp lại, sắp bảo vệ khóa luận → **nâng mức**, nhắc ca cũ |
| | | YC-8110 | Mô tả "có vấn đề" → **yêu cầu bổ sung thông tin**, soạn sẵn câu hỏi |
| | | YC-8111 | **Trùng** YC-8103 (wifi tầng 3 Khu E đang xử lý) |
| | | YC-8112 | Có người kẹt thang máy → **Rất khẩn cấp**, loại "Khác" |
| | | YC-8113, YC-8114 | Phân công khảo sát đúng tổ: nội thất → `pmkhoa`, điện → `tvdung` |
| | | YC-8118 | Lập phương án: dự toán 6,2 triệu vượt hạn mức nội bộ → **thuê ngoài, cần BGH duyệt** |
| | | YC-8119 | Lập phương án: thay 8 bóng LED 1,6 triệu → **sửa nội bộ**, không cần duyệt |
| | | YC-8125 | Phân công **người nghiệm thu** cho việc thuê ngoài đang thi công |
| `nttha` | Phê duyệt phương án → **AI phân tích** | YC-8120 | Dự toán sát khảo sát và lịch sử → **Duyệt** |
| | | YC-8121 | Dự toán 18,5 triệu, gần gấp đôi khảo sát (chỉ cần thay 7/12 bộ) → **Trả lại** |
| | | YC-8122 | Trần F102 từng chống thấm nay thấm lại → **duyệt có điều kiện**, hỏi bảo hành nhà thầu cũ |
| `pvbinh` | Công việc thuê ngoài → **AI chọn nhà thầu** | YC-8123 | Nhà thầu nước duy nhất từng nghiệm thu không đạt → nêu rủi ro, điều kiện bảo hành |
| | | YC-8124 | Nhà thầu mạng có cả ca tốt lẫn ca không đạt / trễ hạn → cân nhắc |
| `lvtoan` | Công việc sửa chữa → **AI gợi ý** | YC-8115 | Gợi ý khảo sát ống thoát lavabo rò nước |
| `nqbao` | Công việc sửa chữa → **AI gợi ý** | YC-8116 | Gợi ý khảo sát 4 máy phòng E301 mất mạng |
| `lhnam` | Công việc sửa chữa → **AI gợi ý** | YC-8117, YC-9002 | Gợi ý khảo sát cửa kẹt / đèn chập chờn |
| `tvdung` | Nghiệm thu → **AI checklist** | YC-8126 | Nhà thầu Hòa Khánh từng không đạt và trễ hạn → checklist kỹ hơn |
| `lhnam` | Nghiệm thu → **AI checklist** | YC-8127, YC-9007 | Nghiệm thu thay người khảo sát; bám lỗi lần nghiệm thu trước |

Tất cả tài khoản dùng mật khẩu `123`.

## 6b. Tự tạo dữ liệu thử

1. Đăng nhập `nmanh` (giảng viên) hoặc `sv_hoang` (sinh viên) → **Tạo yêu cầu**. Viết mô tả theo kiểu muốn thử, rồi bấm **Phân tích mô tả** để xem AI gợi ý ngay khi tạo:
   - **Nguy hiểm:** "mùi khét", "tia lửa", "nước chảy xuống ổ cắm", "người bị kẹt" → AI nâng lên Rất khẩn cấp.
   - **Việc nhỏ:** "vẫn sử dụng được", "hơi lung lay" → AI đề xuất hạ mức.
   - **Mô tả mơ hồ:** "phòng có vấn đề" → AI đề nghị hỏi thêm.
   - **Trùng:** báo lại đúng sự cố đang mở (wifi Khu E, điều hòa C101) → AI cảnh báo trùng.
2. `tqhuy`: **Danh sách yêu cầu** → nút **AI** của yêu cầu vừa tạo → áp dụng phân loại → **Tiếp nhận yêu cầu** → AI phân công người khảo sát.
3. Cán bộ được phân công (`lhnam`, `tvdung`, `nqbao`, `lvtoan` hoặc `pmkhoa`): **Công việc sửa chữa** → **AI gợi ý** → điền và gửi phiếu khảo sát.
4. `tqhuy`: mở yêu cầu → AI lập phương án → **Dùng phương án**. Phương án sẽ chuyển BGH duyệt nếu là thuê ngoài, hoặc nếu được đánh dấu "cần phê duyệt" (AI tự đánh dấu khi dự toán từ 3 triệu).
   - Muốn thử AI bắt lỗi dự toán: ghi dự toán khảo sát thấp (ví dụ 2 triệu), rồi sửa phương án lên cao (ví dụ 5 triệu).
5. `nttha`: **Phê duyệt phương án** → **AI phân tích** → Duyệt hoặc Trả lại.
6. Nếu thuê ngoài:
   - `pvbinh`: **AI chọn nhà thầu** → cập nhật tiến độ → báo hoàn thành.
   - `tqhuy`: phân công người nghiệm thu.
   - Cán bộ nghiệm thu: **AI checklist** → nghiệm thu.
7. `tqhuy` hoặc `nttha`: **Nhật ký Trợ lý AI** để xem tỉ lệ đề xuất được chấp nhận, sửa hoặc bác bỏ.

## 7. Deploy (Render + Vercel)

1. Render → service `due-facility-api` → **Environment**: thêm `GEMINI_API_KEY` (không commit key vào Git).
2. `render.yaml` đã đặt `gunicorn --timeout 120` vì mỗi lượt agent có thể mất 10–30 giây.
3. Deploy lại backend: lệnh build tự chạy `migrate` và `seed_demo`. Seed chạy lại nhiều lần không bị nhân đôi dữ liệu.
4. Frontend Vercel không cần biến mới.

Lưu ý: key Gemini gói miễn phí bị giới hạn số lượt gọi mỗi phút. Khi bị giới hạn, hệ thống tự chuyển model dự phòng, rồi đến luật dự phòng. Nếu thao tác nhanh liên tục lúc demo, có thể thấy nhãn "Luật dự phòng"; nghỉ khoảng 1 phút rồi bấm "Phân tích lại" là được.

## 8. Kiểm thử

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py test core
```

Có 25 test, gồm 11 test nghiệp vụ cũ và 14 test AI:
- luật dự phòng (cả 9 loại đề xuất);
- phân quyền theo vai trò và trạng thái;
- tự đối chiếu quyết định;
- chuyển quyền nghiệm thu;
- vòng lặp agent với Gemini giả lập (giữ `thoughtSignature`, thực thi function call);
- chặn mã cán bộ bịa;
- nhắc agent tra cứu và hệ thống tự tính lại số liệu.
