---
id: T-E2E-CHAT-CHECKOUT
type: test
title: "E2E: chat → cấu hình → giỏ → thanh toán giả lập → PAID"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-07", "FR-04", "FR-05", "FR-06", "NFR-05", "UC-03", "UC-09", "UC-10"]
code: []
tests: ["e2e/advisor-to-payment.spec.ts"]
diagrams: []
---

**Công cụ:** Playwright, Chromium 1440 px và 390 px, API thật ở chế độ dự phòng trên CSDL `pcbuilder_e2e` được seed lại mỗi lần chạy, bản build production của web. Luồng demo chính của đồ án:

trang chủ → gõ "chơi game 25 triệu" vào ô hero → `/advisor` → luồng SSE trả 3 cấu hình (Tối ưu hiệu năng, Cân bằng, Tiết kiệm), mỗi cấu hình 8 linh kiện, trong ngân sách và được kiểm lại bằng `POST /compatibility/check` (không có lỗi) → 3 BuildCard hiện ra → "Thêm cả bộ vào giỏ" → giỏ có nhóm cấu hình "Đủ bộ, 8 linh kiện" → "Đặt lắp ráp" → nhập họ tên, số điện thoại, địa chỉ (khách vãng lai) → đơn BUILD 201, tổng = tạm tính + phí lắp ráp → trang thanh toán có ảnh VietQR với đúng số tiền và mã đơn → giả lập chuyển khoản qua `POST /payments/:code/simulate` → trang tự cập nhật "Đã nhận thanh toán" (poll 3 giây) và đơn ở trạng thái PAID.

**Kết quả (2026-11-08):** xem bảng E2E trong `docs/testing/test-report.md` (số lần chạy, tỷ lệ flaky).
