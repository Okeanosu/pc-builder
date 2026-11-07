---
id: E-ORDER
type: entity
title: "Đơn hàng"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `orders`

Mã đơn duy nhất (`code`), loại RETAIL/BUILD, trạng thái (PENDING_PAYMENT, PAID, PROCESSING, SHIPPING, COMPLETED, CANCELLED), trạng thái thanh toán (UNPAID, PAID, REFUNDED), tạm tính, phí lắp ráp, phí giao, tổng, thông tin giao hàng, `paid_at`, `expires_at` (hạn giữ hàng). Chỉ mục `(status, expires_at)` cho job quét đơn quá hạn.
