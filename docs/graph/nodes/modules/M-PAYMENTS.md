---
id: M-PAYMENTS
type: module
title: "Module payments: VietQR, webhook SePay, giả lập"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["E-PAYMENT", "M-ORDERS"]
  decidedBy: ["ADR-002", "ADR-021"]
code: ["apps/api/src/modules/payments/**"]
tests: ["apps/api/src/modules/payments/**/*.test.ts"]
diagrams: []
---

Bộ dựng URL VietQR (hàm thuần `buildVietQrUrl`), xác thực webhook bằng API key (so sánh thời gian hằng), đối chiếu nội dung và số tiền, xử lý idempotent theo `provider_txn_id` (chèn `payments` dưới khóa dòng của đơn, `ON CONFLICT DO NOTHING`), chuyển đơn sang PAID qua máy trạng thái của M-ORDERS, endpoint trạng thái cho trang thanh toán poll, API giả lập thanh toán (không ghi giao dịch thừa khi đơn đã thanh toán).
