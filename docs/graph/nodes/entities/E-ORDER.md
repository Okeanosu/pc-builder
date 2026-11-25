---
id: E-ORDER
type: entity
title: "Đơn hàng"
status: done
chapters: ["CH4"]
links:
  decidedBy: ["ADR-017"]
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `orders`

Mã đơn duy nhất (`code`), loại RETAIL/BUILD, trạng thái (PENDING_PAYMENT, PAID, PROCESSING, SHIPPING, COMPLETED, CANCELLED), trạng thái thanh toán (UNPAID, PAID, REFUNDED), tạm tính, phí lắp ráp, phí giao, tổng, thông tin giao hàng, `paid_at`, `expires_at` (hạn giữ hàng), `guest_id` (khách vãng lai đã đặt đơn, dùng kiểm tra quyền xem/hủy; null với đơn của tài khoản). Chỉ mục `(status, expires_at)` cho job quét đơn quá hạn.
