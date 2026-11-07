---
id: T-E2E-A11Y
type: test
title: "E2E: kiểm tra khả năng truy cập có cấu trúc (không dùng axe-core)"
status: done
chapters: ["CH4"]
links:
  verifies: ["NFR-06", "F-UI-DESIGN-SYSTEM"]
code: []
tests: ["e2e/a11y.spec.ts"]
diagrams: []
---

`e2e/a11y.spec.ts`, chạy ở cả 1440 px và 390 px:

- Trên `/`, `/advisor`, `/builder`, `/c/cpu`, `/cart`, `/checkout`: `<html lang="vi">`, đúng một landmark `main`, có `banner`, đúng một `h1`, và trang không cuộn ngang ở khung nhìn của dự án (một phần yêu cầu responsive 360–1440 px).
- Biểu mẫu thanh toán: Tab đi đúng thứ tự Họ và tên → Số điện thoại → Địa chỉ giao hàng → Ghi chú; ô đang focus có vòng focus nhìn thấy được (box-shadow của khung ô nhập); gửi biểu mẫu rỗng bằng phím Enter thì các ô bắt buộc có `aria-invalid="true"`, thông báo lỗi được gắn qua `aria-describedby` và focus chuyển về ô lỗi đầu tiên.

**Giới hạn:** không đo độ tương phản màu và không quét tự động toàn bộ quy tắc WCAG (không có axe-core trong dự án); trang quản trị chưa được kiểm (tiêu đề trang quản trị nằm trong thanh trên, không phải thẻ `h1` — xem mục vấn đề đã biết trong `docs/testing/test-report.md`).
