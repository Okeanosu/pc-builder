---
id: T-API-VIETQR
type: test
title: "Unit test dựng URL VietQR và xác thực webhook"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-06", "F-PAYMENT-VIETQR"]
code: []
tests: ["apps/api/src/modules/payments/vietqr.test.ts", "apps/api/src/modules/payments/payments.webhook.int.test.ts"]
diagrams: []
---

Unit: URL đúng định dạng `compact2`, `amount` là số nguyên, `addInfo` là mã đơn, tên tài khoản tiếng Việt được mã hóa URL; số tiền lẻ/âm bị từ chối; mã đơn sinh ra đúng mẫu `PCB[A-Z2-7]{8}` và được nhận diện trong nội dung chuyển khoản bất kể vị trí, chữ hoa/thường. Integration (webhook): sai hoặc thiếu API key → 401; số tiền thiếu → payment UNDERPAID, đơn giữ nguyên; gửi lặp cùng `provider_txn_id` không xử lý hai lần; giao dịch ra, mã lạ, body sai → 200 bỏ qua; tiền đến sau khi đơn hết hạn → MANUAL_REVIEW; giả lập chỉ ngoài production hoặc ADMIN.
