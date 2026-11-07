---
id: API-CATALOG
type: api
title: "API danh mục và sản phẩm"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-CATALOG"]
  dependsOn: ["M-CATALOG"]
code: ["apps/api/src/modules/catalog/**"]
tests: ["apps/api/src/modules/catalog/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/categories`
- `GET /api/categories/:slug/facets`
- `GET /api/products?category=&q=&brand=&minPrice=&maxPrice=&specs[socket]=AM5&sort=&page=`
- `GET /api/products/:slug`

Danh sách phân trang (`Paginated<ProductSummaryDTO>`), chi tiết `ProductDTO` kèm benchmark, facet `FacetDTO[]`. Tham số `specs[...]` được dịch sang phép chứa JSONB.
