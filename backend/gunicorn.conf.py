"""Cấu hình gunicorn khi deploy (Render chạy lệnh từ thư mục backend nên tự nạp file này).

Trợ lý AI có thể mất 10-90 giây cho một lượt phân tích (chờ Gemini trả lời), nên:
- dùng worker dạng thread để một lượt AI không chặn các request khác;
- nâng timeout lên 120 giây (mặc định 30 giây sẽ cắt ngang lượt phân tích).
"""

import os

workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_class = "gthread"
threads = int(os.getenv("GUNICORN_THREADS", "4"))
timeout = 120
graceful_timeout = 30
