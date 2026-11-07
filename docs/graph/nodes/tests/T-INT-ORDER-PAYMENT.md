---
id: T-INT-ORDER-PAYMENT
type: test
title: "Integration test giỏ hàng - đặt hàng - webhook - PAID"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-04", "FR-05", "FR-06", "F-ORDER", "F-PAYMENT-VIETQR"]
code: []
tests: ["apps/api/src/modules/orders/**/*.int.test.ts", "apps/api/src/modules/payments/**/*.int.test.ts"]
diagrams: []
---

Luồng đầy đủ: thêm vào giỏ → tạo đơn → webhook SePay → đơn PAID, tồn kho trừ, `inventory_movements` ghi đúng.
