---
id: F-ADMIN-ORDERS
type: feature
title: "Quản trị đơn hàng"
status: done
chapters: ["CH4"]
links:
  decidedBy: ["ADR-021"]
  realizes: ["FR-15", "UC-15"]
  dependsOn: ["M-ADMIN", "F-ORDER", "F-AUTH"]
  shownIn: ["SCR-ADMIN-ORDERS", "SCR-ADMIN-PAYMENTS"]
code: ["apps/api/src/modules/admin/orders/**", "apps/web/src/features/admin/orders/**", "apps/web/src/features/admin/OrderStatusControl.tsx"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts", "apps/web/src/features/admin/orders/**/*.test.ts"]
diagrams: []
---

**Mục đích:** xử lý đơn từ khi nhận tiền đến khi giao.

**Mô tả:** `GET /admin/orders` lọc theo trạng thái, loại (RETAIL/BUILD) và tìm theo mã đơn, số điện thoại, tên người nhận; `GET /admin/orders/:code` kèm email khách và các giao dịch `payments`. Chuyển trạng thái qua `PATCH /admin/orders/:code/status`, dùng lại máy trạng thái của F-ORDER dưới khóa dòng nên không thể nhảy bước (`409 INVALID_TRANSITION`). Hủy đơn đã thanh toán chỉ dành cho ADMIN (cần hoàn tiền thủ công): hàng được trả về kho (movement CANCEL) và trạng thái thanh toán của đơn chuyển REFUNDED. Xác nhận thanh toán thủ công (PENDING_PAYMENT sang PAID) cũng chỉ dành cho ADMIN và ghi một dòng `payments` loại MANUAL cùng transaction (ADR-021); STAFF nhận `403 FORBIDDEN` và giao diện ẩn hai nút này. Đơn BUILD ở bước PROCESSING được hiểu là đang lắp ráp.

**Trạng thái:** API và trang quản trị xong. Web: lọc theo trạng thái/loại/mã đơn/số điện thoại, chi tiết đơn với đối soát giao dịch VietQR, `OrderTimeline`, `OrderStatusControl` chỉ đưa ra bước chuyển hợp lệ (bản sao máy trạng thái có test), hủy đơn đã thanh toán khóa với STAFF (SCR-ADMIN-ORDERS).
