---
id: SCR-PAY
type: screen
title: "Trang thanh toán VietQR"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]shop[)]/orders/**", "apps/web/src/features/checkout/PaymentView.tsx", "apps/web/src/features/checkout/payment.ts", "apps/web/src/features/checkout/countdown.ts", "apps/web/src/features/account/OrderTimeline.tsx", "apps/web/src/features/account/OrderSummary.tsx"]
tests: ["apps/web/src/features/checkout/payment.test.ts", "apps/web/src/features/checkout/checkout.test.ts", "apps/web/src/features/account/timeline.test.ts"]
diagrams: []
---

**Route:** `/orders/[code]/pay` (CSR)

Ảnh VietQR (`qrImageUrl`) luôn đặt trên nền trắng để app ngân hàng quét được, kèm số tiền, nội dung chuyển khoản và số tài khoản/ngân hàng, mỗi dòng có nút sao chép; đếm ngược tới `expiresAt` bằng chữ mono cỡ lớn. Trang poll `GET /orders/:code/payment` mỗi 3 giây (cả khi tab ở nền) cho tới khi đơn đã thanh toán hoặc bị hủy.

Đã thanh toán → trạng thái thành công với OrderTimeline và tóm tắt đơn. Hết giờ → "Mã QR đã hết hạn" nhưng vẫn tiếp tục kiểm tra giao dịch đến muộn cho tới khi server hủy đơn; đã hủy → hướng dẫn đặt lại. Khi chạy dev có nút "Giả lập thanh toán (dev)" gọi `POST /payments/:code/simulate`. Việc xác định trạng thái hiển thị (chờ / hết hạn / đã thanh toán / đã hủy) và định dạng đếm ngược là hàm thuần có unit test.
