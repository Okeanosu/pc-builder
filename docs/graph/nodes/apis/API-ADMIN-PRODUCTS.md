---
id: API-ADMIN-PRODUCTS
type: api
title: "API quản trị sản phẩm"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-PRODUCTS"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/products/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/admin/products?category=&q=&status=&lowStock=&page=&pageSize=`
- `GET /api/admin/products/:id`
- `POST /api/admin/products` (`adminProductCreateSchema`, 201)
- `PATCH /api/admin/products/:id` (`adminProductPatchSchema`, không sửa tồn kho)
- `DELETE /api/admin/products/:id` (ẩn mềm, `status = HIDDEN`)
- `PUT /api/admin/categories/:id/schema` (chỉ ADMIN, mảng `SpecField`)

Chỉ ADMIN/STAFF. Trả `AdminProductDTO` (thêm `stockOnHand`, `reserved`, `status`). Thông số được kiểm tra theo `specSchema` của danh mục và schema có kiểu của Engine; lỗi trả 422 kèm chi tiết từng trường (`specs.socket`), trùng SKU/slug trả `409 DUPLICATE`.
