# Mã nguồn các tài liệu trong docs/reports

Mỗi thư mục sinh ra một tài liệu HTML tự chứa (ảnh nhúng base64) rồi in thành PDF A4 bằng Playwright.
Cần Python 3 có Pillow, Node.js có `@playwright/test`; tài liệu tương thích cần web :3000 và API :4000 đang chạy để chụp ảnh.

| Thư mục | Tài liệu | Dựng lại |
| --- | --- | --- |
| `tu-dien-du-lieu/` | `tu-dien-du-lieu.pdf` | `python3 gen.py ../../erd-co-so-du-lieu.png .` rồi `node to-pdf.cjs tu-dien-du-lieu.print.html tu-dien-du-lieu.pdf` |
| `co-so-du-lieu/` | `co-so-du-lieu-chi-tiet.pdf` | `python3 gen.py` rồi `node to-pdf.cjs db.html db.pdf` |
| `tuong-thich/` | `tuong-thich-linh-kien.pdf` | `node shots.cjs shots`, `python3 assemble.py` rồi `node to-pdf.cjs report.html report.pdf` |

`co-so-du-lieu/` dùng lại nội dung cột của `tu-dien-du-lieu/data.py`; quan hệ, chỉ mục, cấu trúc JSONB và kịch bản đơn hàng nằm trong `content.py`. `samples.json` là một dòng dữ liệu thật của mỗi bảng, lấy từ cơ sở dữ liệu ngày 12/11/2026 (đã bỏ chuỗi băm mật khẩu).
