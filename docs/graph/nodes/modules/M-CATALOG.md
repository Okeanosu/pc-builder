---
id: M-CATALOG
type: module
title: "Module catalog: danh mục, sản phẩm, facet lọc động"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-API-CORE", "E-PRODUCT", "E-CATEGORY", "E-BRAND", "E-BENCHMARK"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/catalog/**"]
tests: ["apps/api/src/modules/catalog/**/*.test.ts"]
diagrams: []
---

Gồm `catalog.filters.ts` (thuần, có unit test), `catalog.repository.ts` (truy vấn Drizzle) và `catalog.service.ts`. Tham số `specs[key]=v` được định kiểu theo `specSchema` của danh mục (số, boolean, phần tử mảng `enum[]`/`number[]`) rồi dịch sang phép chứa JSONB `specs @> $json`; các khóa một giá trị gộp thành một đối tượng chứa, nhiều giá trị cách nhau bởi dấu phẩy thì OR. `specsMin[key]`/`specsMax[key]` lọc khoảng số qua `(specs->>'key')::numeric` (chỉ cho thuộc tính kiểu số). Tìm kiếm `q` dùng ILIKE trên tên/SKU và `to_tsvector('simple', name)`. Lọc giá theo giá thực trả (`coalesce(sale_price, price)`). Danh mục được đổi sang `category_id` trước khi truy vấn để planner dùng thống kê thật và chọn chỉ mục GIN.

Facet đếm giá trị của các trường `filterable` trên sản phẩm ACTIVE của danh mục (mảng được tách từng phần tử), sắp theo kiểu: số tăng dần, enum theo thứ tự `options`, boolean `true` trước. `getEngineCatalog()` nạp sản phẩm ACTIVE còn hàng khả dụng (`stock - reserved > 0`) thành `EngineProduct` và cache cả danh sách ở Redis `cache:candidates:v{catalogVersion}` (5 phút); khi giá, tồn kho, thông số hoặc trọng số đổi, chỉ cần tăng `catalog:version`, khóa cũ tự hết hạn.
