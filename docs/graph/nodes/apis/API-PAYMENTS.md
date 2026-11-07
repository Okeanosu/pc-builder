---
id: API-PAYMENTS
type: api
title: "API thanh toán"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-PAYMENT-VIETQR"]
  dependsOn: ["M-PAYMENTS"]
code: ["apps/api/src/modules/payments/**"]
tests: ["apps/api/src/modules/payments/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/orders/:code/payment`
- `POST /api/payments/webhook/sepay`
- `POST /api/payments/:orderCode/simulate`

`PaymentInfoDTO` gồm URL ảnh QR, ngân hàng, số tài khoản, nội dung chuyển khoản, trạng thái, hạn thanh toán. Webhook xác thực bằng `Authorization: Apikey ...`. `simulate` chỉ dev/admin.
