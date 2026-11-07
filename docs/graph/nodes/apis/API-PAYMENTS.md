---
id: API-PAYMENTS
type: api
title: "API thanh toán"
status: done
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

`PaymentInfoDTO` gồm URL ảnh QR (null khi đơn không còn chờ thanh toán), ngân hàng, số tài khoản, tên tài khoản, nội dung chuyển khoản (mã đơn), trạng thái đơn và thanh toán, hạn thanh toán; cùng quyền xem như `GET /orders/:code`. Webhook xác thực bằng `Authorization: Apikey ...` (sai hoặc thiếu → 401), body theo chuẩn SePay, luôn trả `200 {success:true}` cho lời gọi đã xác thực; chuyển khoản không khớp đơn nào được lưu với trạng thái NO_ORDER. `simulate` (body tùy chọn `{amount}`) chỉ ngoài production hoặc ADMIN (ngược lại 403), trả `PaymentInfoDTO` sau khi xử lý.
