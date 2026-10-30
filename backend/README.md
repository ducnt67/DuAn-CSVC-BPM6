# Backend Django - Quản lý sửa chữa cơ sở vật chất

Tài liệu này hướng dẫn chạy backend, đăng nhập web bằng tài khoản demo, tạo tài khoản mới và kiểm tra dữ liệu đã lưu.

Backend cung cấp REST API cho frontend React. Dữ liệu nghiệp vụ được lưu trong database phía server; trình duyệt chỉ giữ JWT đăng nhập. Khi phát triển local, hệ thống dùng SQLite nên không cần cài thêm database server.

## 1. Chuẩn bị môi trường

Cần có:

- Windows và PowerShell.
- Python 3.10 trở lên.
- Node.js và npm để chạy frontend.

Mở PowerShell tại thư mục dự án. Vào thư mục backend:

```powershell
cd D:\HocTap\DuAn-CSVC-BPM6\backend
```

Tạo môi trường Python và cài thư viện (chỉ cần làm lần đầu):

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

> Hãy chạy các lệnh Django bằng `.\.venv\Scripts\python.exe`. Cách này bảo đảm dùng đúng Python đã cài Django trong `backend\.venv`, tránh nhầm với môi trường `.venv` của thư mục dự án hoặc Python khác trên máy.

## 2. Tạo database và dữ liệu demo

Trong PowerShell đang ở thư mục `backend`, chạy:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
```

- `migrate` tạo/cập nhật cấu trúc database.
- `seed_demo` tạo 6 tài khoản, 12 cơ sở vật chất và 8 yêu cầu mẫu để thử các bước nghiệp vụ.
- Database SQLite được lưu tại `backend\db.sqlite3`.
- Không cần chạy lại seed mỗi lần mở web. Có thể chạy lại để bảo đảm tài khoản demo tồn tại; lệnh này đặt lại mật khẩu của 6 tài khoản demo về `123`, cập nhật danh mục cơ sở mẫu và không nhân đôi các yêu cầu mẫu đã có.

Muốn đặt một mật khẩu khác cho các tài khoản demo:

```powershell
.\.venv\Scripts\python.exe manage.py seed_demo --password "MatKhauMoi"
```

## 3. Khởi chạy backend và frontend

### Cửa sổ PowerShell thứ nhất: backend

Từ thư mục `backend`, chạy:

```powershell
.\.venv\Scripts\python.exe manage.py runserver
```

Để terminal này mở. Backend chạy tại `http://127.0.0.1:8000`; API gốc là `http://127.0.0.1:8000/api/v1/`.

### Cửa sổ PowerShell thứ hai: frontend

Mở cửa sổ terminal mới, chuyển về thư mục gốc dự án:

```powershell
cd D:\HocTap\DuAn-CSVC-BPM6
npm install
npm run dev
```

`npm install` chỉ cần chạy lần đầu hoặc sau khi thay đổi dependencies. Mở địa chỉ local mà Vite in ra trong terminal, thường là `http://localhost:3000`. Frontend đã được cấu hình proxy `/api` về backend tại cổng `8000`.

Đăng nhập web bằng `nmanh` / `123` để tạo yêu cầu với vai trò giảng viên. Muốn thử luồng của vai trò khác, đăng xuất rồi đăng nhập bằng tài khoản tương ứng bên dưới.

## 4. Tài khoản demo

Các tài khoản này được tạo trong database local bởi `seed_demo`. Mật khẩu mặc định của tất cả là `123`.

| Tên đăng nhập | Vai trò | Dùng để thử |
|---|---|---|
| `nmanh` | Giảng viên / người yêu cầu | Tạo yêu cầu, theo dõi và xác nhận kết quả |
| `sv_hoang` | Sinh viên / người yêu cầu | Tạo và theo dõi yêu cầu với vai trò sinh viên |
| `tqhuy` | Quản trị CSVC | Tiếp nhận yêu cầu, yêu cầu bổ sung, phân công cán bộ, lập phương án |
| `lhnam` | Cán bộ kỹ thuật | Khảo sát, cập nhật sửa chữa và nghiệm thu |
| `nttha` | Ban Giám hiệu | Phê duyệt hoặc từ chối phương án |
| `pvbinh` | Đầu tư & Mua sắm | Cập nhật công việc thuê ngoài |

Đây là thông tin đăng nhập **chỉ dành cho local/demo**, không dùng các mật khẩu này khi triển khai thật.

## 5. Tạo tài khoản mới

Tài khoản đăng nhập web cần có `username`, mật khẩu, được bật `is_active` và có `role` phù hợp. Cách đơn giản nhất là tạo qua Django Admin:

1. Tạo tài khoản quản trị một lần:

   ```powershell
   .\.venv\Scripts\python.exe manage.py createsuperuser
   ```

2. Mở `http://127.0.0.1:8000/admin/`, đăng nhập bằng superuser vừa tạo.
3. Trong mục **Users**, chọn thêm tài khoản.
4. Nhập tên đăng nhập và mật khẩu; điền tên, email, mã người dùng (nếu chưa nhập, backend tự sinh), phòng ban và điện thoại nếu cần.
5. Chọn `Role` phù hợp:
   - `REQUESTER`: giảng viên/sinh viên tạo yêu cầu.
   - `FACILITY_ADMIN`: quản trị cơ sở vật chất.
   - `STAFF`: cán bộ kỹ thuật.
   - `DIRECTOR`: Ban Giám hiệu.
   - `PROCUREMENT`: Đầu tư & Mua sắm.

   Trong luồng xử lý, cán bộ kỹ thuật ghi nhận khảo sát; sau đó Quản trị CSVC lập phương án và trình Ban Giám hiệu phê duyệt nếu cần.
6. Đánh dấu tài khoản hoạt động (`is_active`). Chỉ bật quyền nhân viên quản trị (`is_staff`) nếu người đó cần đăng nhập Django Admin; người dùng web thông thường không cần quyền này.

Sau khi tạo, dùng `username` và mật khẩu đó để đăng nhập web. Endpoint `/api/v1/users/` chỉ dùng để tra cứu tài khoản trong ứng dụng, không phải endpoint tạo tài khoản.

## 6. Xem và kiểm tra dữ liệu

### Xem trong giao diện web

Đăng nhập bằng một tài khoản demo, tạo hoặc cập nhật dữ liệu, sau đó tải lại trang. Web tải dữ liệu lại từ database backend; nếu thao tác đã được lưu thành công, dữ liệu vẫn còn. Tài khoản thường chỉ nhìn thấy dữ liệu theo quyền của vai trò.

### Xem trong Django Admin

Đăng nhập tại `http://127.0.0.1:8000/admin/` bằng superuser. Mục **Repair requests** hiển thị yêu cầu; các mục **Facilities**, **Users**, phương án, nghiệm thu, thông báo và các hồ sơ liên quan giúp quản trị dữ liệu. Django Admin là màn hình quản trị, còn người dùng cuối thao tác qua frontend.

### Kiểm tra API đăng nhập và đọc yêu cầu bằng PowerShell

Khi backend đang chạy, mở terminal PowerShell khác và chạy:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/auth/token/" `
  -ContentType "application/json" `
  -Body '{"username":"nmanh","password":"123"}'

$headers = @{ Authorization = "Bearer $($login.access)" }
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/v1/requests/" `
  -Headers $headers
```

Nếu đăng nhập thành công, lệnh đầu trả JWT; lệnh sau trả danh sách yêu cầu mà tài khoản có quyền xem. Các danh sách API có phân trang với các trường `count`, `next`, `previous`, `results`.

## 7. Khắc phục lỗi thường gặp

### `ModuleNotFoundError: No module named 'django'`

Python đang chạy không phải môi trường backend hoặc dependencies chưa được cài. Từ thư mục `backend`, chạy:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py runserver
```

Nếu chưa có `backend\.venv`, chạy `py -m venv .venv` trước.

### Không đăng nhập được hoặc web báo không kết nối được máy chủ

1. Kiểm tra backend đang chạy tại `http://127.0.0.1:8000`.
2. Kiểm tra frontend được mở từ `npm run dev`, thường là `http://localhost:3000`.
3. Đảm bảo đã chạy `migrate` và `seed_demo`.
4. Thử lại tài khoản `nmanh` / `123`. Chạy lại `seed_demo` nếu cần đặt lại mật khẩu demo.

### Cổng 8000 đang được sử dụng

Đóng tiến trình backend cũ đang giữ cổng rồi chạy lại `runserver`. Nếu chọn cổng khác, cần cập nhật proxy `/api` trong `vite.config.js` cho cùng cổng đó.

## 8. Kiểm tra backend

Chạy từ thư mục `backend`:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test core
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
```

## 9. Database và triển khai

SQLite phù hợp cho phát triển local; backend tự tạo file `backend\db.sqlite3`. Có thể cấu hình PostgreSQL qua biến môi trường `DATABASE_URL`, ví dụ:

```powershell
$env:DATABASE_URL = "postgresql://db_user:db_password@localhost:5432/due_facility"
$env:DJANGO_SECRET_KEY = "thay-bang-secret-key-ngau-nhien"
$env:DJANGO_DEBUG = "false"
$env:DJANGO_ALLOWED_HOSTS = "api.example.edu.vn"
$env:CORS_ALLOWED_ORIGINS = "https://app.example.edu.vn"
```

Trước khi triển khai ngoài local, cần đặt secret riêng, cấu hình host/CORS đúng môi trường, thay mật khẩu demo và dùng PostgreSQL hoặc database phù hợp. Không đưa mật khẩu, secret key hay thông tin database thật vào Git.

## API chính

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/api/v1/auth/token/` | Đăng nhập và nhận JWT; chấp nhận username hoặc email |
| `POST` | `/api/v1/auth/token/refresh/` | Làm mới access token |
| `GET` | `/api/v1/auth/me/` | Lấy thông tin tài khoản hiện tại |
| `GET` | `/api/v1/users/?role=STAFF` | Tra cứu người dùng theo vai trò |
| `GET/POST/PATCH` | `/api/v1/facilities/` | Xem, thêm hoặc cập nhật danh mục cơ sở vật chất |
| `GET/POST` | `/api/v1/requests/` | Xem hoặc gửi yêu cầu sửa chữa |
| `GET` | `/api/v1/requests/{YC-code}/` | Xem chi tiết yêu cầu và lịch sử xử lý |
| `GET` | `/api/v1/repair-plans/`, `/api/v1/external-works/` | Xem phương án và công việc thuê ngoài |
| `GET` | `/api/v1/notifications/` | Xem thông báo theo tài khoản |
| `GET` | `/api/v1/reports/summary/` | Lấy thống kê báo cáo |
| `GET` | `/api/v1/reports/export.csv` | Xuất báo cáo CSV |

Các API nghiệp vụ cần JWT. Các bước tiếp nhận, phân công, khảo sát, lập/phê duyệt phương án, sửa chữa, thuê ngoài và nghiệm thu được kiểm tra quyền/trạng thái ở backend. Cán bộ kỹ thuật thực hiện khảo sát; Quản trị CSVC lập phương án sau khi khảo sát hoàn tất. Mã yêu cầu, phương án, công việc thuê ngoài và biên bản được sinh tuần tự (ví dụ `YC-0001`, `PA-0001`, `TN-0001`, `NT-0001`); database dùng UUID làm khóa chính.
