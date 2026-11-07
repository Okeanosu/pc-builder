---
id: API-ORDERS
type: api
title: "API đơn hàng"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-ORDER"]
  dependsOn: ["M-ORDERS"]
code: ["apps/api/src/modules/orders/**"]
tests: ["apps/api/src/modules/orders/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/orders`
- `GET /api/me/orders`
- `GET /api/orders/:code`
- `POST /api/orders/:code/cancel`

Tạo đơn RETAIL/BUILD, xem và hủy đơn. Lỗi nghiệp vụ: 409 khi hết hàng, 409 khi chuyển trạng thái không hợp lệ.
