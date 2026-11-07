---
id: M-CATALOG
type: module
title: "Module catalog: danh mục, sản phẩm, facet lọc động"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["M-API-CORE", "E-PRODUCT", "E-CATEGORY", "E-BRAND", "E-BENCHMARK"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/catalog/**"]
tests: ["apps/api/src/modules/catalog/**/*.test.ts"]
diagrams: []
---

Truy vấn sản phẩm có lọc/sắp xếp/phân trang, dựng câu lọc JSONB `@>` từ tham số `specs[...]`, tính facet từ `specSchema`, cache ứng viên cho Engine theo danh mục (5 phút, xóa khi admin sửa sản phẩm).
