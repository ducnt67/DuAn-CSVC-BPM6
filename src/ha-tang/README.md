# Hạ tầng ứng dụng

Thư mục này chứa các adapter kết nối frontend với backend, bao gồm REST API client và các hàm chuẩn hóa dữ liệu.

- `api/apiClient.js`: gọi API, lưu JWT và tự động làm mới access token.
- `api/backendDataService.js`: tải dữ liệu, tạo/cập nhật yêu cầu và các tài nguyên liên quan.
- `luu-tru/`: các tiện ích lưu trữ dùng chung; dữ liệu nghiệp vụ chính không lưu ở trình duyệt.

Khi chạy local, frontend gọi Django qua proxy `/api` của Vite. Database và dữ liệu nghiệp vụ nằm ở backend; trình duyệt chỉ giữ access/refresh token trong `localStorage` hoặc `sessionStorage` tùy lựa chọn ghi nhớ đăng nhập.
