---
id: API-CATALOG
type: api
title: "API danh mục và sản phẩm"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-CATALOG"]
  dependsOn: ["M-CATALOG"]
code: ["apps/api/src/modules/catalog/**"]
tests: ["apps/api/src/modules/catalog/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/categories` → `CategoryDTO[]` theo `sort_order`, kèm `specSchema`
- `GET /api/categories/:key/facets` → `FacetDTO[]` (chấp nhận key hoặc slug; 404 nếu không có danh mục)
- `GET /api/products?category=&q=&brand=&minPrice=&maxPrice=&inStock=&specs[socket]=AM5&specsMin[cores]=8&specsMax[cores]=16&sort=&page=&pageSize=` → `Paginated<ProductSummaryDTO>`
- `GET /api/products/:slugOrId` → `ProductDTO` kèm benchmark (404 nếu không có hoặc đang ẩn)

`specs[...]` được định kiểu theo `specSchema` và dịch sang phép chứa JSONB `specs @> $json`; nhiều giá trị cách nhau bởi dấu phẩy được OR (`specs[socket]=AM5,AM4`). `specsMin`/`specsMax` lọc khoảng cho thuộc tính số. `brand` nhận danh sách cách nhau bởi dấu phẩy, không phân biệt hoa thường; khoảng giá áp dụng trên giá thực trả (giá khuyến mãi nếu có). `sort`: `newest` (mặc định), `price_asc`, `price_desc`, `name`, `performance` (CPU theo điểm đa nhân, GPU theo điểm đồ họa, danh mục khác theo giá giảm dần). Chỉ sản phẩm ACTIVE được trả về. Giá trị sai kiểu → 422 `VALIDATION_ERROR` kèm đường dẫn trường.
