---
id: F-PAYMENT-VIETQR
type: feature
title: "Thanh toán VietQR động, webhook SePay và giả lập"
status: planned
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-06", "UC-10"]
  dependsOn: ["M-PAYMENTS", "E-PAYMENT", "F-ORDER", "F-INVENTORY-LOCK"]
  decidedBy: ["ADR-008"]
  shownIn: ["SCR-PAY"]
code: ["apps/api/src/modules/payments/**", "apps/web/src/features/payment/**"]
tests: ["apps/api/src/modules/payments/**/*.test.ts", "apps/api/src/modules/payments/**/*.int.test.ts"]
diagrams: ["docs/diagrams/seq-checkout-vietqr.mmd"]
---

**Mục đích:** nhận tiền chuyển khoản và tự chuyển đơn sang đã thanh toán mà không cần nhân viên đối soát tay.

**Mô tả:** URL ảnh QR dựng theo `https://img.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NO}-compact2.png?amount={total}&addInfo={orderCode}`. Webhook `POST /payments/webhook/sepay` kiểm tra header `Authorization: Apikey ...`, nội dung chuyển khoản chứa mã đơn, số tiền `transferAmount >= total`, và idempotent theo `provider_txn_id` (cột unique) nên gửi lặp không cộng hai lần. Trang thanh toán poll mỗi 3 giây. `POST /payments/:orderCode/simulate` chỉ cho dev/admin để demo.

**Quyết định chính:** ADR-008 - dùng dịch vụ miễn phí và chuẩn webhook SePay để demo được mà không cần hợp đồng ngân hàng thật.
