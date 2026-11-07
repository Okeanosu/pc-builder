---
id: F-PAYMENT-VIETQR
type: feature
title: "Thanh toán VietQR động, webhook SePay và giả lập"
status: in-progress
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

**Mô tả:** `GET /orders/:code/payment` trả `PaymentInfoDTO`; chỉ khi đơn đang chờ thanh toán mới có URL ảnh QR (đã thanh toán/hủy/hết hạn thì `qrImageUrl = null` để không ai chuyển tiền nhầm), `https://img.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NO}-compact2.png?amount={total}&addInfo={orderCode}&accountName={tên đã mã hóa URL}` (hàm thuần `buildVietQrUrl`). Webhook `POST /payments/webhook/sepay` kiểm tra header `Authorization: Apikey ...` (so sánh thời gian hằng), chỉ xử lý `transferType = 'in'`, thử lần lượt mọi mã khớp `/PCB[A-Z2-7]{8}/` trong `content` (khách có thể dán nhầm một mã trước), giao dịch không khớp đơn nào vẫn được lưu với `order_id` null, trạng thái NO_ORDER (ghi log mức warn, xem ở `GET /admin/payments?status=NO_ORDER`), và idempotent theo `provider_txn_id` (cột unique): bản ghi `payments` được chèn dưới khóa dòng của đơn với `ON CONFLICT DO NOTHING`, nên gửi lặp hay gửi đồng thời đều không xử lý hai lần. `transferAmount >= total` → đơn PAID qua máy trạng thái (trừ kho, ghi movement), payment SUCCESS; thiếu tiền → payment UNDERPAID, đơn giữ nguyên; tiền đến khi đơn đã hết hạn/hủy → payment MANUAL_REVIEW để xử lý tay. Mọi lời gọi đã xác thực đều nhận `200 {success:true}` (kể cả giao dịch bị bỏ qua hoặc body sai) để SePay không gửi lại; riêng lỗi hệ thống bất ngờ (ví dụ mất kết nối DB) trả 5xx để SePay gửi lại, điều này an toàn nhờ tính idempotent. `POST /payments/:orderCode/simulate` chạy đúng đường xử lý đó với giao dịch giả, chỉ cho phép ngoài production hoặc với ADMIN.

**Quyết định chính:** ADR-008 - dùng dịch vụ miễn phí và chuẩn webhook SePay để demo được mà không cần hợp đồng ngân hàng thật.

**Trạng thái:** API xong; trang thanh toán (web, poll 3 giây) chưa làm.
