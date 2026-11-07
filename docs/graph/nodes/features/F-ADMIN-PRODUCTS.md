---
id: F-ADMIN-PRODUCTS
type: feature
title: "Quản trị sản phẩm với form schema động"
status: planned
chapters: ["CH4"]
links:
  realizes: ["FR-12", "UC-12"]
  dependsOn: ["M-ADMIN", "E-PRODUCT", "E-CATEGORY", "E-BRAND", "F-AUTH"]
  decidedBy: ["ADR-002"]
  shownIn: ["SCR-ADMIN-PRODUCTS"]
code: ["apps/api/src/modules/admin/products/**", "apps/web/src/features/admin/products/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** để chủ cửa hàng tự thêm và sửa linh kiện mà không cần lập trình.

**Mô tả:** form nhập thông số (`DynamicSpecForm`) sinh từ `specSchema` của danh mục; server kiểm tra `specs` theo cùng schema (specSchema validator) trước khi lưu. Admin chỉnh được `specSchema` qua `PUT /admin/categories/:id/schema`. Sửa sản phẩm xóa cache `cache:candidates:{category}`.
