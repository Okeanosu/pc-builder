---
id: T-API-VIETQR
type: test
title: "Unit test dựng URL VietQR và xác thực webhook"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-06", "F-PAYMENT-VIETQR"]
code: []
tests: ["apps/api/src/modules/payments/**/*.test.ts"]
diagrams: []
---

URL đúng định dạng, số tiền và nội dung được mã hóa; webhook sai API key bị từ chối; số tiền thiếu bị từ chối; gửi lặp cùng `provider_txn_id` không xử lý hai lần.
