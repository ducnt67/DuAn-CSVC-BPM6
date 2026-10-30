# HỆ THỐNG QUẢN LÝ SỬA CHỮA CƠ SỞ VẬT CHẤT – DUE FACILITY MANAGEMENT

Ứng dụng frontend mô phỏng quản lý quy trình sửa chữa cơ sở vật chất (Facility Management & Business Process Management) dành cho **Trường Đại học Kinh tế – Đại học Đà Nẵng (DUE)**.

Ứng dụng quản lý quy trình từ tiếp nhận yêu cầu, khảo sát, lập phương án và dự toán, phê duyệt khi cần, đến sửa chữa nội bộ hoặc thuê ngoài, nghiệm thu và xác nhận hoàn thành. Dữ liệu nghiệp vụ và xác thực được xử lý qua Django REST API; SQLite là cơ sở dữ liệu mặc định khi phát triển local.

> **Backend Django:** Hướng dẫn khởi chạy, tạo dữ liệu mẫu, tài khoản demo, API và các ràng buộc workflow nằm trong [backend/README.md](./backend/README.md). `localStorage`/`sessionStorage` chỉ giữ JWT đăng nhập theo lựa chọn ghi nhớ; dữ liệu nghiệp vụ được lưu trong database phía backend.

---

## 1. Công nghệ sử dụng

- **Frontend Core**: React 18 (JavaScript ES6+), Vite 6.
- **Routing**: React Router DOM v6 với Layout phân cấp; các trang nghiệp vụ yêu cầu có phiên đăng nhập demo.
- **Biểu đồ thống kê**: Recharts (PieChart, BarChart trực quan).
- **Icons**: Lucide React.
- **Xử lý ngày tháng & tiền tệ**: `date-fns` (Vietnamese Locale), `Intl.NumberFormat` (VND).
- **Lưu trữ dữ liệu**: Database Django; trình duyệt chỉ giữ JWT đăng nhập trong `localStorage` hoặc `sessionStorage`.
- **Giao diện**: CSS thuần (CSS Custom Properties) tuân thủ bảng màu nhận diện DUE E-Study:
  - Màu cam (`#F58220`): Nút hành động chính, điểm nhấn tương tác.
  - Màu xanh dương (`#1677C8`): Sidebar, liên kết, trạng thái tiến trình.
  - Màu xanh lá (`#229A58`): Hoàn thành, Nghiệm thu ĐẠT, Phê duyệt.
  - Màu trắng (`#FFFFFF`): Nền trang, thẻ nội dung, sạch sẽ và thoáng đãng.

---

## 2. 5 Actor nghiệp vụ và Tài khoản Demo

Đây là đăng nhập mô phỏng phía frontend, không phải hệ thống xác thực bảo mật production. Tại màn hình Đăng nhập (`/login`), có thể nhập thông tin một trong 5 tài khoản demo hoặc chọn tài khoản demo để điền/đăng nhập nhanh:

| Mã Actor | Vai trò | Họ và tên Demo | Tên đăng nhập | Mật khẩu | Quyền hạn chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A01** | **Người yêu cầu** | Nguyễn Minh Anh | `nmanh` | `123` | Tạo/theo dõi yêu cầu, bổ sung thông tin được yêu cầu và xác nhận kết quả sửa chữa nội bộ. |
| **A02** | **Quản trị CSVC** | Trần Quốc Huy | `tqhuy` | `123` | Tiếp nhận yêu cầu, yêu cầu bổ sung, phân công cán bộ kỹ thuật và quản lý danh mục CSVC. |
| **A03** | **Cán bộ phụ trách** | Lê Hoàng Nam | `lhnam` | `123` | Khảo sát, lập phương án, cập nhật sửa chữa nội bộ và nghiệm thu công việc thuê ngoài được giao. |
| **A04** | **Ban Giám hiệu** | Nguyễn Thị Thu Hà | `nttha` | `123` | Xem xét, phê duyệt hoặc từ chối phương án; lý do từ chối là bắt buộc. |
| **A05** | **BP Đầu tư & Mua sắm** | Phạm Văn Bình | `pvbinh` | `123` | Quản lý công việc thuê ngoài, thông tin đơn vị thi công và tiến độ. |

> **Lưu ý demo**: Mật khẩu mẫu được khai báo trực tiếp trong mã nguồn và không dùng cho môi trường production. Đăng xuất rồi đăng nhập tài khoản khác để đổi vai trò; tại trang đăng nhập cũng có thao tác nhanh cho các tài khoản demo. Vai trò chủ yếu dùng để lọc menu và điều khiển thao tác trên giao diện, không thay thế phân quyền phía máy chủ.
> Không có tài khoản đăng nhập riêng cho nhà thầu. Thông tin đơn vị thi công được quản lý trong hồ sơ công việc thuê ngoài bởi BP Đầu tư & Mua sắm.

---

## 3. Danh sách các Module chức năng (M01 – M07)

1. **M01 – Quản lý danh mục CSVC** (`/facilities`): Tìm kiếm và lọc danh mục theo loại, tòa nhà; Quản trị CSVC có thể thêm/sửa danh mục; xem các yêu cầu sửa chữa liên quan đến từng hạng mục.
2. **M02 – Quản lý yêu cầu sửa chữa**:
   - `/requests`: Bảng tổng hợp tất cả yêu cầu, tìm kiếm, lọc theo trạng thái, mức độ ưu tiên, hình thức sửa chữa.
   - `/my-requests`: Dành riêng cho Người yêu cầu theo dõi sự cố do mình báo cáo.
   - `/requests/create`: Biểu mẫu tạo yêu cầu, chọn cơ sở vật chất, mô tả chi tiết và đính kèm tệp. Bản demo hiện chỉ lưu tên tệp, chưa tải/lưu nội dung tệp.
   - `/requests/:id`: Trang chi tiết trung tâm với **Visual Timeline BPM**, phân tab thông tin, và các hộp thoại thao tác động theo vai trò.
3. **M03 – Quản lý xử lý sửa chữa** (`/repair-work`): Danh sách công việc được giao cho Cán bộ phụ trách, có thể lọc theo các giai đoạn khảo sát, lập phương án, sửa chữa nội bộ và nghiệm thu/khắc phục.
4. **M04 – Quản lý phương án & Phê duyệt**:
   - `/repair-plans`: Danh sách phương án kỹ thuật, hình thức sửa chữa, dự toán và trạng thái phê duyệt.
   - `/approvals`: Danh sách phương án theo trạng thái chờ duyệt, đã duyệt hoặc bị từ chối; Ban Giám hiệu có thể phê duyệt hoặc từ chối phương án đang chờ, với lý do từ chối bắt buộc.
5. **M05 – Quản lý công việc thuê ngoài** (`/external-work`): BP Đầu tư & Mua sắm cập nhật đơn vị thi công, thông tin liên hệ và tiến độ (0–100%); thao tác báo hoàn thành chuyển yêu cầu sang Chờ nghiệm thu.
6. **M06 – Quản lý nghiệm thu thuê ngoài** (`/acceptance`): Cán bộ phụ trách kiểm tra hiện trường, ghi nhận ĐẠT/KHÔNG ĐẠT; nếu không đạt phải nhập nội dung khắc phục. Có thể xem lịch sử các lần nghiệm thu. Sau khi đạt, cán bộ thực hiện thêm bước xác nhận hoàn thành.
7. **M07 – Báo cáo và thống kê** (`/reports`): Tổng hợp số lượng yêu cầu, hoàn thành, đang xử lý, cần khắc phục và kinh phí dự toán; biểu đồ trạng thái, hình thức sửa chữa, kinh phí theo tòa nhà; lọc theo tòa nhà/hình thức và xuất CSV có UTF-8 BOM để hỗ trợ Excel.

---

## 4. Bốn Luồng quy trình chuẩn (BPM Workflows)

### Luồng 1: Sửa chữa nội bộ thành công
1. **Người yêu cầu** tạo yêu cầu sự cố (`NEW`).
2. **Quản trị CSVC** tiếp nhận (`ACCEPTED`) và phân công **Cán bộ phụ trách** (`SURVEYING`).
3. **Cán bộ phụ trách** khảo sát hiện trường và lập phương án sửa chữa nội bộ. Phương án nội bộ mặc định được duyệt tự động; nếu đánh dấu cần phê duyệt thì chuyển qua Ban Giám hiệu trước khi sửa chữa (`INTERNAL_REPAIR`).
4. **Cán bộ phụ trách** sửa chữa xong và cập nhật kết quả -> Chuyển sang `WAITING_FOR_CONFIRMATION`.
5. **Người yêu cầu** kiểm tra kết quả và bấm **Xác nhận kết quả** -> Chuyển sang `COMPLETED`.

### Luồng 2: Sửa chữa thuê ngoài thành công
1. Khảo sát xong, **Cán bộ phụ trách** lập phương án "Thuê ngoài" kèm dự toán kinh phí -> Gửi Ban Giám hiệu (`WAITING_FOR_APPROVAL`).
2. **Ban Giám hiệu** phê duyệt phương án -> Chuyển sang `WAITING_FOR_EXTERNAL_WORK`.
3. **BP Đầu tư & Mua sắm** tiếp nhận, giao đơn vị thi công, cập nhật tiến độ -> `EXTERNAL_WORK_IN_PROGRESS`.
4. Đơn vị thi công xong, BP Đầu tư báo hoàn thành -> Chuyển sang `WAITING_FOR_ACCEPTANCE`.
5. **Cán bộ phụ trách** kiểm tra thực tế, lưu biên bản **Nghiệm thu ĐẠT**. Yêu cầu vẫn ở trạng thái `WAITING_FOR_ACCEPTANCE` cho đến bước xác nhận.
6. **Cán bộ phụ trách** bấm **Xác nhận hoàn thành** sau khi nghiệm thu đạt -> Chuyển sang `COMPLETED`.

### Luồng 3: Sửa chữa thuê ngoài Nghiệm thu KHÔNG ĐẠT
1. **Cán bộ phụ trách** kiểm tra thực tế thấy sự cố chưa được xử lý triệt để -> Lập biên bản **Nghiệm thu KHÔNG ĐẠT**, nhập yêu cầu khắc phục bắt buộc.
2. Yêu cầu chuyển sang `NEEDS_REMEDIATION`; chưa thể xác nhận hoàn thành khi kết quả nghiệm thu chưa đạt.
3. **BP Đầu tư & Mua sắm** cập nhật hồ sơ thuê ngoài/tiến độ sau khi yêu cầu khắc phục.
4. **Cán bộ phụ trách** tổ chức nghiệm thu lại. Khi nghiệm thu ĐẠT mới được xác nhận hoàn thành.

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
└── ha-tang/         # Client REST API và tiện ích hạ tầng
```

Mỗi module trong `tinh-nang/` được tổ chức theo màn hình (`trang/`). Các component dùng chung không thuộc riêng nghiệp vụ nào được đặt trong `dung-chung/`. Dữ liệu khởi tạo được cung cấp bởi lệnh seed của Django; frontend tải và lưu các thay đổi nghiệp vụ qua adapter REST API trong `ha-tang/api/`.

Luồng nghiệp vụ hiện được phối hợp giữa các màn hình và `AppContext`, nơi cung cấp state qua `useApp()`. `AppContext` khởi tạo dữ liệu từ backend và các thao tác tạo/cập nhật/xóa được gửi đến API; lỗi từ server được hiển thị trong giao diện.

## 6. Hướng dẫn cài đặt và chạy ứng dụng

### Yêu cầu môi trường
- Node.js (phiên bản 18+ trở lên).
- npm hoặc yarn.

### Các bước khởi chạy

1. Cài đặt các gói phụ thuộc:
```bash
npm install
```

2. Khởi chạy Django backend trong một cửa sổ PowerShell riêng:
```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```
Nếu đã cài đặt backend trước đó, chỉ cần chạy `python manage.py runserver`. Database SQLite mặc định nằm tại `backend/db.sqlite3`; tài khoản mẫu và cách kiểm tra API được mô tả trong [backend/README.md](./backend/README.md).

3. Khởi chạy frontend trong cửa sổ terminal khác:
```bash
npm run dev
```
Trình duyệt sẽ mở tại: `http://localhost:5173/` (hoặc cổng hiển thị trên console).

4. Xây dựng bản phát hành sản phẩm (Production Build):
```bash
npm run build
```
Bản dựng tối ưu được tạo ra trong thư mục `dist/`.

5. Xem trước bản dựng production:
```bash
npm run preview
```

---

## 7. Khôi phục dữ liệu mẫu (Reset Demo Data)
Trong quá trình trải nghiệm thao tác thay đổi dữ liệu hoặc chuyển đổi trạng thái, bạn có thể khôi phục lại toàn bộ dữ liệu mẫu ban đầu bất kỳ lúc nào bằng cách bấm nút **Khôi phục dữ liệu mẫu** (biểu tượng mũi tên xoay tròn `RotateCcw`) trên thanh Header.
