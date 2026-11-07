---
id: E-CART
type: entity
title: "Giỏ hàng"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `carts`

Mỗi người dùng có tối đa một giỏ (`user_id` duy nhất, xóa theo người dùng). Giỏ khách vãng lai nằm ở Redis, không có bảng.
