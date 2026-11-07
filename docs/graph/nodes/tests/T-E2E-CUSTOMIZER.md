---
id: T-E2E-CUSTOMIZER
type: test
title: "E2E: chọn linh kiện xung đột trong Customizer thì cảnh báo"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-09", "UC-05", "F-CUSTOMIZER", "R-C01"]
code: []
tests: ["e2e/customizer-conflict.spec.ts"]
diagrams: []
---

Mở một cấu hình gợi ý thật (gaming 25 triệu) trong Customizer qua `/builder?build=<id>`, đổi CPU sang một CPU AM5 và mainboard sang một bo LGA1700 (lấy từ API catalog lúc chạy, khác linh kiện đang dùng) → cả hai slot hiện mã C01 kèm thông điệp "Socket CPU (AM5) không khớp mainboard (LGA1700)", huy hiệu "Xung đột" màu đỏ (kiểm cả lớp CSS và màu tính toán) → bấm "Lưu & chia sẻ" thì `POST /builds` trả 422 `INCOMPATIBLE` có C01 trong `details`, toast hiện "C01: …" và trang không rời `/builder`. Chứng minh kiểm tra phía client và phía server dùng cùng bộ luật.

**Kết quả (2026-11-08):** xem bảng E2E trong `docs/testing/test-report.md`.
