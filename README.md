# HỆ THỐNG QUẢN LÝ SỬA CHỮA CƠ SỞ VẬT CHẤT – DUE FACILITY MANAGEMENT

Ứng dụng quản lý quy trình sửa chữa cơ sở vật chất (Facility Management & Business Process Management) dành cho **Trường Đại học Kinh tế – Đại học Đà Nẵng (DUE)**.

Hệ thống mô phỏng đầy đủ quy trình nghiệp vụ thực tế từ khâu tiếp nhận yêu cầu, khảo sát, lập phương án dự toán, Ban Giám hiệu phê duyệt, phân công sửa chữa nội bộ hoặc thuê ngoài, nghiệm thu chất lượng theo biên bản thực tế và xác nhận hoàn thành.

---

## 1. Công nghệ sử dụng

- **Frontend Core**: React 18 (JavaScript ES6+), Vite 6.
- **Routing**: React Router DOM v6 với Layout phân cấp và bảo vệ phiên demo.
- **Biểu đồ thống kê**: Recharts (PieChart, BarChart trực quan).
- **Icons**: Lucide React.
- **Xử lý ngày tháng & tiền tệ**: `date-fns` (Vietnamese Locale), `Intl.NumberFormat` (VND).
- **Lưu trữ dữ liệu**: `localStorage` đồng bộ 2 chiều (khởi tạo dữ liệu mẫu phong phú và tự động lưu thay đổi giữa các lần tải lại trang).
- **Giao diện**: CSS thuần (CSS Custom Properties) tuân thủ bảng màu nhận diện DUE E-Study:
  - Màu cam (`#F58220`): Nút hành động chính, điểm nhấn tương tác.
  - Màu xanh dương (`#1677C8`): Sidebar, liên kết, trạng thái tiến trình.
  - Màu xanh lá (`#229A58`): Hoàn thành, Nghiệm thu ĐẠT, Phê duyệt.
  - Màu trắng (`#FFFFFF`): Nền trang, thẻ nội dung, sạch sẽ và thoáng đãng.

---

## 2. 5 Actor nghiệp vụ và Tài khoản Demo

Hệ thống hoạt động theo cơ chế xác thực tài khoản thực tế. Tại màn hình Đăng nhập (`/login`), người dùng có thể nhập Tên đăng nhập và Mật khẩu tương ứng với 5 vai trò nghiệp vụ (hoặc sử dụng các nút thao tác nhanh tiện lợi):

| Mã Actor | Vai trò | Họ và tên Demo | Tên đăng nhập | Mật khẩu | Quyền hạn chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A01** | **Người yêu cầu** | Nguyễn Minh Anh | `nmanh` | `123` | Tạo yêu cầu, bổ sung thông tin, xác nhận kết quả sửa chữa nội bộ. |
| **A02** | **Quản trị CSVC** | Trần Quốc Huy | `tqhuy` | `123` | Tiếp nhận yêu cầu, kiểm tra, phân công cán bộ kỹ thuật, quản lý danh mục CSVC. |
| **A03** | **Cán bộ phụ trách** | Lê Hoàng Nam | `lhnam` | `123` | Khảo sát hiện trạng, lập phương án, sửa chữa nội bộ, nghiệm thu thực tế thuê ngoài. |
| **A04** | **Ban Giám hiệu** | Nguyễn Thị Thu Hà | `nttha` | `123` | Phê duyệt phương án & dự toán, từ chối phương án (nhập lý do bắt buộc). |
| **A05** | **BP Đầu tư & Mua sắm** | Phạm Văn Bình | `pvbinh` | `123` | Quản lý hồ sơ thuê ngoài, chọn nhà thầu, cập nhật tiến độ, báo thi công xong. |

> **Quy tắc vận hành chuẩn thực tế**: Trong khi đang sử dụng hệ thống, không có dropdown chuyển đổi vai trò tùy ý. Để chuyển vai trò, người dùng bấm **"Đăng xuất"** trên Header và đăng nhập vào tài khoản của vai trò khác — đúng chuẩn phần mềm doanh nghiệp thực tế.
> Tuyệt đối không tạo tài khoản Nhà thầu bên ngoài theo đúng yêu cầu nghiệp vụ. Thông tin nhà thầu được lưu trong hồ sơ thuê ngoài do BP Đầu tư & Mua sắm quản lý.

---

## 3. Danh sách các Module chức năng (M01 – M07)

1. **M01 – Quản lý danh mục CSVC** (`/facilities`): Xem danh mục phòng học, thiết bị máy chiếu, máy lạnh, lọc theo tòa nhà (Khu C, B, H, E...), thêm/sửa CSVC, xem lịch sử sửa chữa của từng thiết bị.
2. **M02 – Quản lý yêu cầu sửa chữa**:
   - `/requests`: Bảng tổng hợp tất cả yêu cầu, tìm kiếm, lọc theo trạng thái, mức độ ưu tiên, hình thức sửa chữa.
   - `/my-requests`: Dành riêng cho Người yêu cầu theo dõi sự cố do mình báo cáo.
   - `/requests/create`: Biểu mẫu tạo yêu cầu kèm chọn cơ sở vật chất, mô tả chi tiết và tải ảnh hiện trạng.
   - `/requests/:id`: Trang chi tiết trung tâm với **Visual Timeline BPM**, phân tab thông tin, và các hộp thoại thao tác động theo vai trò.
3. **M03 – Quản lý xử lý sửa chữa** (`/repair-work`): Không gian làm việc riêng của Cán bộ kỹ thuật theo các giai đoạn: Cần khảo sát, Cần lập phương án, Đang xử lý nội bộ, Cần nghiệm thu.
4. **M04 – Quản lý phương án & Phê duyệt**:
   - `/repair-plans`: Danh sách các phương án kỹ thuật và dự toán kinh phí.
   - `/approvals`: Hộp thư phê duyệt dành cho Ban Giám hiệu (Duyệt ngay hoặc Từ chối kèm lý do).
5. **M05 – Quản lý mua sắm và thi công xây dựng** (`/external-work`): BP Đầu tư & Mua sắm quản lý thông tin nhà thầu, tỷ lệ hoàn thành (0 - 100%), báo thi công xong chuyển sang Chờ nghiệm thu.
6. **M06 – Quản lý nghiệm thu và xác nhận kết quả** (`/acceptance`): Cán bộ kỹ thuật kiểm tra hiện trường, lập biên bản ghi nhận ĐẠT / KHÔNG ĐẠT. Nếu Không đạt phải nhập nội dung khắc phục. Chỉ khi nghiệm thu ĐẠT mới mở khóa nút "Xác nhận hoàn thành". Lưu giữ toàn bộ lịch sử các lần kiểm tra.
7. **M07 – Báo cáo và thống kê** (`/reports`): Báo cáo chỉ số KPI, biểu đồ phân bổ trạng thái, so sánh kinh phí theo tòa nhà, và nút **Xuất CSV thực tế** (hỗ trợ hiển thị tiếng Việt trên Excel nhờ UTF-8 BOM).

---

## 4. Bốn Luồng quy trình chuẩn (BPM Workflows)

### Luồng 1: Sửa chữa nội bộ thành công
1. **Người yêu cầu** tạo yêu cầu sự cố (`NEW`).
2. **Quản trị CSVC** tiếp nhận (`ACCEPTED`) và phân công **Cán bộ phụ trách** (`SURVEYING`).
3. **Cán bộ phụ trách** khảo sát hiện trường, lập phương án hình thức "Sửa chữa nội bộ" (`INTERNAL_REPAIR`).
4. **Cán bộ phụ trách** sửa chữa xong và cập nhật kết quả -> Chuyển sang `WAITING_FOR_CONFIRMATION`.
5. **Người yêu cầu** kiểm tra thực tế, bấm **Xác nhận kết quả** -> Chuyển sang `COMPLETED`.

### Luồng 2: Sửa chữa thuê ngoài thành công
1. Khảo sát xong, **Cán bộ phụ trách** lập phương án "Thuê ngoài" kèm dự toán kinh phí -> Gửi Ban Giám hiệu (`WAITING_FOR_APPROVAL`).
2. **Ban Giám hiệu** phê duyệt phương án -> Chuyển sang `WAITING_FOR_EXTERNAL_WORK`.
3. **BP Đầu tư & Mua sắm** tiếp nhận, giao đơn vị thi công, cập nhật tiến độ -> `EXTERNAL_WORK_IN_PROGRESS`.
4. Đơn vị thi công xong, BP Đầu tư báo hoàn thành -> Chuyển sang `WAITING_FOR_ACCEPTANCE`.
5. **Cán bộ phụ trách** kiểm tra thực tế, lập biên bản **Nghiệm thu ĐẠT**.
6. **Cán bộ phụ trách** bấm **Xác nhận hoàn thành thuê ngoài** -> Chuyển sang `COMPLETED`.

### Luồng 3: Sửa chữa thuê ngoài Nghiệm thu KHÔNG ĐẠT
1. **Cán bộ phụ trách** kiểm tra thực tế thấy sự cố chưa được xử lý triệt để -> Lập biên bản **Nghiệm thu KHÔNG ĐẠT**, nhập yêu cầu khắc phục bắt buộc -> Chuyển sang `NEEDS_REMEDIATION`.
2. Hệ thống tự động vô hiệu hóa nút "Xác nhận hoàn thành".
3. **BP Đầu tư & Mua sắm** yêu cầu nhà thầu khắc phục và cập nhật lại tiến độ.
4. **Cán bộ phụ trách** tổ chức nghiệm thu lại (Lần 2). Khi nghiệm thu ĐẠT mới được ký xác nhận hoàn thành.

### Luồng 4: Phương án bị Ban Giám hiệu từ chối
1. **Ban Giám hiệu** xem xét dự toán, bấm **Từ chối** và nhập lý do bắt buộc (VD: "Dự toán quá cao, cần tận dụng linh kiện cũ").
2. Yêu cầu chuyển về `WAITING_FOR_PLAN`.
3. **Cán bộ phụ trách** xem lý do từ chối, điều chỉnh lại phương án kỹ thuật và gửi phê duyệt lại.

---

## 5. Kiến trúc thư mục frontend

Mã nguồn được tổ chức theo hướng **Feature-based Architecture**. Tên thư mục dùng tiếng Việt không dấu để dễ đọc nhưng vẫn tương thích tốt với các môi trường phát triển khác nhau.

```text
src/
├── ung-dung/        # Điểm khởi tạo, router và provider toàn hệ thống
├── tinh-nang/       # Các module nghiệp vụ và màn hình chức năng
│   ├── xac-thuc/
│   ├── bang-dieu-khien/
│   ├── yeu-cau-sua-chua/
│   ├── co-so-vat-chat/
│   ├── xu-ly-sua-chua/
│   ├── phuong-an-sua-chua/
│   ├── phe-duyet/
│   ├── thue-ngoai/
│   ├── nghiem-thu/
│   └── bao-cao/
├── dung-chung/      # Component, layout, hook, tiện ích và hằng số dùng chung
├── du-lieu-demo/    # Dữ liệu mô phỏng phục vụ trình diễn frontend
└── ha-tang/         # Adapter localStorage và lớp tích hợp API tương lai
```

Mỗi module trong `tinh-nang/` được tổ chức theo màn hình (`trang/`). Các component dùng chung không thuộc riêng nghiệp vụ nào được đặt trong `dung-chung/`. Dữ liệu demo được tách khỏi mã nguồn nghiệp vụ để sau này có thể thay bằng API mà không phải thay đổi cấu trúc giao diện.

Logic cập nhật dữ liệu được tách thành các service trong từng module nghiệp vụ. `AppContext` hiện đóng vai trò điều phối state và giữ nguyên API `useApp()` để các màn hình sử dụng ổn định. Việc đọc/ghi `localStorage` được cô lập trong `ha-tang/luu-tru`, giúp có thể thay thế bằng REST API ở giai đoạn sau.

## 6. Hướng dẫn cài đặt và chạy ứng dụng

### Yêu cầu môi trường
- Node.js (phiên bản 18+ trở lên).
- npm hoặc yarn.

### Các bước khởi chạy

1. Cài đặt các gói phụ thuộc:
```bash
npm install
```

2. Khởi chạy môi trường phát triển (Dev Server):
```bash
npm run dev
```
Trình duyệt sẽ mở tại: `http://localhost:5173/` (hoặc cổng hiển thị trên console).

3. Xây dựng bản phát hành sản phẩm (Production Build):
```bash
npm run build
```
Bản dựng tối ưu được tạo ra trong thư mục `dist/`.

4. Xem trước bản dựng production:
```bash
npm run preview
```

---

## 7. Khôi phục dữ liệu mẫu (Reset Demo Data)
Trong quá trình trải nghiệm thao tác thay đổi dữ liệu hoặc chuyển đổi trạng thái, bạn có thể khôi phục lại toàn bộ dữ liệu mẫu ban đầu bất kỳ lúc nào bằng cách bấm nút **Khôi phục dữ liệu mẫu** (biểu tượng mũi tên xoay tròn `RotateCcw`) trên thanh Header.
