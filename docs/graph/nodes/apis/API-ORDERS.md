---
id: API-ORDERS
type: api
title: "API đơn hàng"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-ORDER"]
  dependsOn: ["M-ORDERS"]
code: ["apps/api/src/modules/orders/**"]
tests: ["apps/api/src/modules/orders/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/orders` (`checkoutSchema`, 201 `OrderDTO`)
- `GET /api/me/orders?page=&pageSize=` (đăng nhập, `Paginated<OrderDTO>`)
- `GET /api/orders/:code` (chủ đơn, khách vãng lai đã đặt, hoặc STAFF/ADMIN; người khác nhận 404)
- `POST /api/orders/:code/cancel` (chủ đơn, chỉ khi PENDING_PAYMENT)

Tạo đơn RETAIL/BUILD, xem và hủy đơn. Lỗi nghiệp vụ: `400 EMPTY_CART`, `409 OUT_OF_STOCK` khi hết hàng (kèm tên sản phẩm), `409 INVALID_TRANSITION` khi chuyển trạng thái không hợp lệ.
