---
id: E-CART-ITEM
type: entity
title: "Dòng giỏ hàng"
status: done
chapters: ["CH4"]
links:
  decidedBy: ["ADR-017"]
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `cart_items`

Sản phẩm và số lượng trong giỏ, `build_id` tùy chọn để gom các dòng thuộc cùng cấu hình. Ràng buộc duy nhất `(cart_id, product_id, build_id)` dạng `NULLS NOT DISTINCT`, nên cả dòng mua lẻ (`build_id` null) cũng không trùng và thêm vào giỏ dùng được `INSERT … ON CONFLICT DO UPDATE` nguyên tử (migration `0001_commerce_hardening`).
