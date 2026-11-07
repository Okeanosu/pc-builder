---
id: M-CART
type: module
title: "Module cart: giỏ hàng Redis/DB và gộp giỏ"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["E-CART", "E-CART-ITEM", "M-BUILDS"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/cart/**"]
tests: ["apps/api/src/modules/cart/**/*.test.ts"]
diagrams: []
---

Giỏ khách vãng lai ở Redis (7 ngày), giỏ người dùng ở DB, gộp khi đăng nhập, thêm cả cấu hình, kiểm tra tồn kho khả dụng khi thêm.
