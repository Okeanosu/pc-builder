---
id: API-ADMIN-PRODUCTS
type: api
title: "API quản trị sản phẩm"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-PRODUCTS"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/products/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET/POST/PATCH/DELETE /api/admin/products`
- `PUT /api/admin/categories/:id/schema`

Chỉ ADMIN/STAFF. Thông số được kiểm tra theo `specSchema` của danh mục; lỗi trả 422 kèm chi tiết từng trường.
