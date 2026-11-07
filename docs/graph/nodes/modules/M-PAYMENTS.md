---
id: M-PAYMENTS
type: module
title: "Module payments: VietQR, webhook SePay, giả lập"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["E-PAYMENT", "M-ORDERS"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/payments/**"]
tests: ["apps/api/src/modules/payments/**/*.test.ts"]
diagrams: []
---

Bộ dựng URL VietQR (hàm thuần), xác thực webhook bằng API key, đối chiếu nội dung và số tiền, xử lý idempotent theo `provider_txn_id`, polling trạng thái, API giả lập thanh toán.
