---
id: E-CART-ITEM
type: entity
title: "Dòng giỏ hàng"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `cart_items`

Sản phẩm và số lượng trong giỏ, `build_id` tùy chọn để gom các dòng thuộc cùng cấu hình. Khóa duy nhất `(cart_id, product_id, build_id)`.
