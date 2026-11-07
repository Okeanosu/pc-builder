---
id: M-ORDERS
type: module
title: "Module orders: tạo đơn, máy trạng thái, giữ hàng, sweeper"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["E-ORDER", "E-ORDER-ITEM", "E-PRODUCT", "E-INVENTORY-MOVEMENT", "M-CART"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/orders/**"]
tests: ["apps/api/src/modules/orders/**/*.test.ts"]
diagrams: []
---

Chứa `orders.state.ts` (máy trạng thái), logic giữ hàng bằng UPDATE có điều kiện, tính phí lắp ráp và phí giao hàng, hủy đơn, và job quét đơn hết hạn mỗi 60 giây.
