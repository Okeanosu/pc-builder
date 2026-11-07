---
id: F-PAYMENT-VIETQR
type: feature
title: "Thanh toán VietQR động, webhook SePay và giả lập"
status: done
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-06", "UC-10"]
  dependsOn: ["M-PAYMENTS", "E-PAYMENT", "F-ORDER", "F-INVENTORY-LOCK"]
  decidedBy: ["ADR-008", "ADR-021"]
  shownIn: ["SCR-PAY", "SCR-ADMIN-PAYMENTS"]
code: ["apps/api/src/modules/payments/**", "apps/web/src/features/checkout/PaymentView.tsx", "apps/web/src/features/checkout/payment.ts"]
tests: ["apps/api/src/modules/payments/**/*.test.ts", "apps/api/src/modules/payments/**/*.int.test.ts"]
diagrams: ["docs/diagrams/seq-checkout-vietqr.mmd"]
---

**Mục đích:** nhận tiền chuyển khoản và tự chuyển đơn sang đã thanh toán mà không cần nhân viên đối soát tay.

**Mô tả:** `GET /orders/:code/payment` trả `PaymentInfoDTO`; chỉ khi đơn đang chờ thanh toán mới có URL ảnh QR (đã thanh toán/hủy/hết hạn thì `qrImageUrl = null` để không ai chuyển tiền nhầm), `https://img.vietqr.io/image/{BANK_BIN}-{ACCOUNT_NO}-compact2.png?amount={total}&addInfo={orderCode}&accountName={tên đã mã hóa URL}` (hàm thuần `buildVietQrUrl`). Webhook `POST /payments/webhook/sepay` kiểm tra header `Authorization: Apikey ...` (so sánh thời gian hằng), chỉ xử lý `transferType = 'in'`, thử lần lượt mọi mã khớp `/PCB[A-Z2-7]{8}/` trong `content` (khách có thể dán nhầm một mã trước), giao dịch không khớp đơn nào vẫn được lưu với `order_id` null, trạng thái NO_ORDER (ghi log mức warn, xem ở `GET /admin/payments?status=NO_ORDER`), và idempotent theo `provider_txn_id` (cột unique): bản ghi `payments` được chèn dưới khóa dòng của đơn với `ON CONFLICT DO NOTHING`, nên gửi lặp hay gửi đồng thời đều không xử lý hai lần. `transferAmount >= total` → đơn PAID qua máy trạng thái (trừ kho, ghi movement), payment SUCCESS; thiếu tiền → payment UNDERPAID, đơn giữ nguyên; tiền đến khi đơn đã hết hạn/hủy → payment MANUAL_REVIEW để xử lý tay. Mọi lời gọi đã xác thực đều nhận `200 {success:true}` (kể cả giao dịch bị bỏ qua hoặc body sai) để SePay không gửi lại; riêng lỗi hệ thống bất ngờ (ví dụ mất kết nối DB) trả 5xx để SePay gửi lại, điều này an toàn nhờ tính idempotent. `POST /payments/:orderCode/simulate` chạy đúng đường xử lý đó với giao dịch giả, chỉ cho phép ngoài production hoặc với ADMIN.

**Quyết định chính:** ADR-008 - dùng dịch vụ miễn phí và chuẩn webhook SePay để demo được mà không cần hợp đồng ngân hàng thật.

**Chuyển khoản không khớp và xác nhận tay (ADR-021):** tiền của giao dịch không tìm được đơn không biến mất mà nằm ở bảng `payments` với `order_id` rỗng (NO_ORDER) để admin đối soát; xác nhận thanh toán thủ công chỉ ADMIN và luôn sinh một dòng `payments` loại MANUAL cùng transaction. Khóa SePay bắt buộc khác mặc định ở production (fail closed). Mọi bước hậu kỳ Redis sau commit không làm hỏng giao dịch đã chốt.

**Kiểm thử đồng thời (báo cáo task 6b):** 5 webhook giống hệt gửi song song cho đúng một dòng `payments`, đơn PAID một lần, kho giảm một lần, một movement ORDER; webhook chạy đua với job hết hạn 6 vòng cho kết quả hoặc PAID (payment SUCCESS) hoặc CANCELLED (payment MANUAL_REVIEW), không bao giờ cả hai, cuối cùng `reserved = 0` và `stock = 50 − số đơn đã trả`.

**Trạng thái:** API và trang thanh toán web (`PaymentView`: mã QR, đồng hồ đếm ngược theo đồng hồ máy chủ, poll trạng thái 3 giây, nút giả lập ngoài production) đã xong (SCR-PAY).
