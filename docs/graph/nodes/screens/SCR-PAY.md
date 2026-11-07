---
id: SCR-PAY
type: screen
title: "Trang thanh toán VietQR"
status: planned
chapters: ["CH4"]
code: ["apps/web/src/app/orders/**"]
tests: []
diagrams: []
---

**Route:** `/orders/[code]/pay` (CSR)

VietQRPanel hiển thị mã QR, số tiền, nội dung chuyển khoản, đếm ngược giữ hàng; tự poll trạng thái mỗi 3 giây và chuyển trang khi đã thanh toán. OrderTimeline hiển thị vòng đời đơn.
