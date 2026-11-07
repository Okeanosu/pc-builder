---
id: F-ORDER
type: feature
title: "Đặt hàng lẻ / nguyên bộ và vòng đời đơn"
status: in-progress
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-05", "UC-09", "UC-11"]
  dependsOn: ["M-ORDERS", "E-ORDER", "E-ORDER-ITEM", "F-INVENTORY-LOCK", "F-CART"]
  shownIn: ["SCR-CHECKOUT", "SCR-ACCOUNT"]
code: ["apps/api/src/modules/orders/**", "apps/web/src/features/checkout/**"]
tests: ["apps/api/src/modules/orders/**/*.test.ts", "apps/api/src/modules/orders/**/*.int.test.ts"]
diagrams: ["docs/diagrams/state-order.mmd"]
---

**Mục đích:** biến giỏ hàng thành đơn có thể thanh toán, theo dõi và xử lý.

**Mô tả:** `POST /orders` nhận thông tin giao hàng (`checkoutSchema`) và dùng giỏ hiện tại của người gọi. Có `buildId` thì tạo đơn BUILD chỉ gồm các dòng của cấu hình đó và cộng `ASSEMBLY_FEE`; không có thì tạo đơn RETAIL từ toàn bộ giỏ; phí giao hàng 0. Giá được tính lại từ DB ngay trong câu UPDATE giữ hàng và lưu vào `name_snapshot`/`price_snapshot`, nên lịch sử đơn không đổi khi giá đổi. Mã đơn `PCB` + 8 ký tự base32 in hoa (an toàn khi ngân hàng bỏ chữ thường/dấu câu trong nội dung chuyển khoản). Khách xem đơn qua `GET /orders/:code` (chủ đơn, đúng khách vãng lai đã đặt, hoặc STAFF/ADMIN) và hủy qua `POST /orders/:code/cancel` khi còn chờ thanh toán; `GET /me/orders` liệt kê đơn của tài khoản.

**Máy trạng thái (`orders.state.ts`):** PENDING_PAYMENT → PAID | CANCELLED; PAID → PROCESSING | CANCELLED; PROCESSING → SHIPPING → COMPLETED; mọi bước khác trả `409 INVALID_TRANSITION`. Đây là đường duy nhất đổi trạng thái: câu UPDATE có điều kiện `status = trạng thái vừa đọc`, nên khi hai luồng tranh nhau (webhook thanh toán và sweeper hết hạn) chỉ một luồng thắng. Hiệu ứng kho đi kèm trong cùng transaction: hủy khi chờ thanh toán nhả `reserved`; thanh toán chuyển giữ hàng thành bán (`stock -= q, reserved -= q`, ghi movement ORDER); hủy đơn đã thanh toán (chỉ ADMIN) trả hàng về kho (movement CANCEL) và đánh dấu REFUNDED.

**Trạng thái:** API xong; trang checkout/tài khoản (web) chưa làm.
