from django.contrib.auth.hashers import PBKDF2PasswordHasher


class FastPBKDF2PasswordHasher(PBKDF2PasswordHasher):
    """PBKDF2-SHA256 với ít vòng băm hơn mặc định của Django.

    Đồ án chạy trên Render gói miễn phí (CPU rất yếu): 1.000.000 vòng mặc định của Django 5.2
    làm mỗi lần đăng nhập mất ~3 giây. 100.000 vòng chỉ còn ~0,3 giây, đổi lại khả năng chống
    dò mật khẩu (khi lộ CSDL) giảm tương ứng - chấp nhận được với đồ án sinh viên.

    Giữ nguyên tên thuật toán "pbkdf2_sha256" nên mật khẩu đã lưu vẫn kiểm tra được; Django tự
    băm lại theo số vòng mới ở lần đăng nhập thành công kế tiếp.
    """

    iterations = 100_000
