---
id: E-PRODUCT
type: entity
title: "Sản phẩm"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `products`

Linh kiện bán được: thuộc một danh mục và một thương hiệu, có SKU/slug duy nhất, giá và giá khuyến mại (`bigint` VND), `stock` và `reserved` (số đang giữ chờ thanh toán; khả dụng = stock - reserved), ảnh, mô tả, trạng thái ACTIVE/HIDDEN, `commercial_boost` (hệ số ưu tiên thương mại cho Engine).

**Điểm nhấn:** cột `specs` (JSONB) lưu thông số động theo `spec_schema` của danh mục; chỉ mục GIN `jsonb_path_ops` trên `specs`, `(category_id, price)` và GIN tìm kiếm tên.
