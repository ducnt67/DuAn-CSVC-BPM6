# Django backend - Quản lý sửa chữa CSVC

Backend REST API cho các luồng hiện có của frontend. Frontend gọi REST API để đăng nhập và đọc/ghi dữ liệu nghiệp vụ vào database; `localStorage` chỉ được dùng để giữ JWT theo lựa chọn ghi nhớ đăng nhập.

## Thành phần

- Django 5.2, Django REST Framework và JWT.
- SQLite mặc định để phát triển; `DATABASE_URL` chuyển sang PostgreSQL.
- Dữ liệu chuẩn hóa cho người dùng/role, cơ sở vật chất, yêu cầu, khảo sát, phương án và lịch sử phê duyệt, hồ sơ thuê ngoài, nghiệm thu, nhật ký BPM, tệp đính kèm theo tên, thông báo và xử lý hợp đồng.
- Chuyển trạng thái và quyền được xác minh phía server. Nghiệm thu không đạt bắt đầu hạn khắc phục 72 giờ; xử lý hợp đồng bị từ chối cho đến khi deadline thực sự qua.

## Chạy local (PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Sau khi chạy, API ở `http://127.0.0.1:8000/api/v1/` và Django Admin tại `/admin/`. Lệnh seed tạo/cập nhật 6 tài khoản, 12 cơ sở vật chất và 8 yêu cầu mẫu ở nhiều trạng thái quy trình; chạy lại sẽ không nhân đôi yêu cầu mẫu. Mật khẩu local mặc định là `123`; có thể đổi bằng `python manage.py seed_demo --password "MatKhauKhac"`. Mật khẩu mặc định chỉ dành cho dữ liệu phát triển local — đổi trước khi dùng ở môi trường khác. Tạo superuser bằng `python manage.py createsuperuser` để quản trị tài khoản.

SQLite file mặc định là `backend/db.sqlite3`. PostgreSQL có thể cấu hình qua biến môi trường:

```powershell
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/due_facility"
$env:DJANGO_SECRET_KEY = "thay-bang-secret-key-ngau-nhien"
$env:DJANGO_DEBUG = "false"
$env:DJANGO_ALLOWED_HOSTS = "api.example.edu.vn"
$env:CORS_ALLOWED_ORIGINS = "https://app.example.edu.vn"
```

## Đăng nhập

`POST /api/v1/auth/token/` nhận `{"username":"nmanh","password":"..."}` và trả JWT. Trường `username` cũng chấp nhận email giống luồng đăng nhập FE. Gửi access token trong header `Authorization: Bearer <access>`. `POST /api/v1/auth/token/refresh/` làm mới access token; `GET /api/v1/auth/me/` trả hồ sơ hiện tại. Demo password do người chạy lệnh `seed_demo` tự đặt.

Tất cả API nghiệp vụ yêu cầu JWT. Danh sách kết quả phân trang theo định dạng DRF (`count`, `next`, `previous`, `results`). Bộ lọc danh sách yêu cầu: `status`, `priority`, `building`, `repairType`, `search`, `mine=true`.

## API chính

| Method | Endpoint | Mục đích / quyền |
|---|---|---|
| GET | `/api/v1/users/?role=STAFF` | Tra cứu tài khoản để phân công |
| GET/POST/PATCH | `/api/v1/facilities/` | Xem danh mục; chỉ `FACILITY_ADMIN` được ghi |
| GET/POST | `/api/v1/requests/` | Xem theo phạm vi role; `REQUESTER` tạo yêu cầu |
| GET | `/api/v1/requests/{YC-code}/` | Chi tiết gồm khảo sát, lịch sử, nghiệm thu, phương án và thuê ngoài |
| POST | `/api/v1/requests/{code}/accept/` | Quản trị tiếp nhận |
| POST | `/api/v1/requests/{code}/request-information/`, `/supplement/` | Yêu cầu / gửi bổ sung thông tin |
| POST | `/api/v1/requests/{code}/assign/` | Quản trị phân công `staffId` |
| POST | `/api/v1/requests/{code}/survey/` | Cán bộ được giao ghi nhận khảo sát |
| POST | `/api/v1/requests/{code}/repair-plan/` | Lập phương án; thuê ngoài luôn cần phê duyệt |
| POST | `/api/v1/requests/{code}/approve/`, `/reject/` | Ban Giám hiệu phê duyệt hoặc từ chối có lý do |
| POST | `/api/v1/requests/{code}/internal-result/`, `/confirm/` | Sửa nội bộ và xác nhận bởi người yêu cầu |
| POST | `/api/v1/requests/{code}/update-external-work/`, `/external-work-done/` | Bộ phận mua sắm cập nhật tiến độ/hoàn thành thi công |
| POST | `/api/v1/requests/{code}/acceptance/` | Cán bộ nghiệm thu; không đạt bắt buộc ghi nội dung khắc phục |
| POST | `/api/v1/requests/{code}/provider-response/` | Ghi nhận nhà cung cấp báo đã khắc phục |
| POST | `/api/v1/requests/{code}/contract-handling/` | Ghi nhận xử lý hợp đồng sau khi quá hạn đủ 72 giờ |
| GET | `/api/v1/repair-plans/`, `/api/v1/external-works/` | Danh sách phương án và công việc thuê ngoài |
| GET/POST | `/api/v1/notifications/` | Xem thông báo theo role; action `mark-read` / `mark-all-read` |
| GET | `/api/v1/reports/summary/` | Thống kê trạng thái, xử lý, dự toán, tòa nhà và hình thức sửa chữa |
| GET | `/api/v1/reports/export.csv` | Xuất danh sách yêu cầu UTF-8 BOM, hỗ trợ lọc `building` / `repairType` |

Mã yêu cầu, phương án, công việc thuê ngoài và biên bản được sinh tuần tự ở dạng `YC-0001`, `PA-0001`, `TN-0001`, `NT-0001`. Các mã này là mã nghiệp vụ; primary key trong DB là UUID.

## Kiểm tra

```powershell
python manage.py check
python manage.py test
```
