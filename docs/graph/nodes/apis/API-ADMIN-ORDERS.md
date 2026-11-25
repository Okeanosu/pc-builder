---
id: API-ADMIN-ORDERS
type: api
title: "API quản trị đơn hàng"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-ORDERS"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/orders/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/admin/orders?status=&type=&q=&page=&pageSize=`
- `GET /api/admin/orders/:code` (`AdminOrderDetailDTO`: đơn + email khách + giao dịch)
- `PATCH /api/admin/orders/:code/status` (`{status}`)

Danh sách có lọc và chuyển trạng thái theo máy trạng thái (`409 INVALID_TRANSITION`); hủy đơn đã thanh toán và xác nhận thanh toán thủ công (PENDING_PAYMENT → PAID, ghi `payments` provider MANUAL) chỉ ADMIN (STAFF nhận 403).
