---
id: F-CATALOG
type: feature
title: "Danh mục sản phẩm, lọc theo thông số JSONB và trang chi tiết"
status: planned
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-01", "FR-02", "UC-01"]
  dependsOn: ["M-CATALOG", "E-PRODUCT", "E-CATEGORY", "E-BENCHMARK"]
  decidedBy: ["ADR-002"]
  shownIn: ["SCR-CATEGORY", "SCR-PRODUCT"]
code: ["apps/api/src/modules/catalog/**", "apps/web/src/features/catalog/**"]
tests: ["apps/api/src/modules/catalog/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** cho khách duyệt và lọc hàng trăm linh kiện có thuộc tính kỹ thuật khác nhau mà không cần một bảng cột riêng cho từng loại.

**Mô tả:** mỗi danh mục khai báo `specSchema` (danh sách trường: khóa, nhãn, kiểu, có lọc được hay không). Thông số của sản phẩm nằm trong cột JSONB `products.specs`. API trả facet (các giá trị và số lượng) sinh từ schema để web dựng bộ lọc động. Lọc theo thông số dùng phép chứa JSONB, ví dụ `specs @> '{"socket":"AM5","memoryType":["DDR5"]}'`, được tăng tốc bằng chỉ mục GIN `jsonb_path_ops`; lọc theo giá dùng chỉ mục `(category_id, price)`; tìm theo tên dùng GIN trên `to_tsvector`.

**Quyết định chính:** dùng JSONB + GIN thay vì mô hình EAV để truy vấn nhanh và thêm danh mục/thuộc tính mà không đổi schema; dữ liệu JSONB vẫn được kiểm tra bằng Zod theo schema từng danh mục. Trang chi tiết render SSR để tối ưu SEO.

**Điểm nhấn cho báo cáo (CH5):** truy vấn JSONB containment + GIN, so sánh có/không có chỉ mục (số liệu EXPLAIN ANALYZE).
