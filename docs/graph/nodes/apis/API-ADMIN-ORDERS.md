---
id: API-ADMIN-ORDERS
type: api
title: "API quản trị đơn hàng"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-ORDERS"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/orders/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:code/status`

Danh sách có lọc và chuyển trạng thái theo máy trạng thái.
