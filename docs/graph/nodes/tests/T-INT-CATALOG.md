---
id: T-INT-CATALOG
type: test
title: "Integration test lọc JSONB và facet"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-01", "FR-02", "F-CATALOG"]
code: []
tests: ["apps/api/src/modules/catalog/**/*.int.test.ts"]
diagrams: []
---

Lọc `category=cpu&specs[socket]=AM5` chỉ trả CPU AM5; định kiểu boolean/mảng theo `specSchema`; OR giá trị cách nhau bởi dấu phẩy; khoảng `specsMin`/`specsMax`; tìm `q` theo tên/SKU; lọc hãng, giá, tồn kho; sắp xếp theo giá và hiệu năng; phân trang; ẩn sản phẩm HIDDEN; facet đếm đúng từng giá trị; cache catalog cho Engine theo phiên bản. Chèn 5.000 sản phẩm tổng hợp rồi `EXPLAIN` câu SQL thật của API phải dùng chỉ mục `products_specs_gin`.
