---
id: SCR-ACCOUNT
type: screen
title: "Tài khoản và đơn hàng của tôi"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]shop[)]/account/**", "apps/web/src/app/[(]shop[)]/orders/**", "apps/web/src/features/account/**"]
tests: ["apps/web/src/features/account/timeline.test.ts"]
diagrams: []
---

**Route:** `/account`, `/account/orders`, `/account/builds`, `/orders/[code]` (CSR)

Khu tài khoản yêu cầu đăng nhập (khách bị chuyển tới `/login?redirect=...`). Tổng quan hiển thị hồ sơ, ba đơn gần nhất và cấu hình đã lưu; `/account/orders` liệt kê `GET /me/orders` có phân trang trên URL; `/account/builds` liệt kê `GET /me/builds` với điểm hiệu năng, AllocationBar và nút "Mua cả bộ".

Trang chi tiết đơn `/orders/[code]` dùng chung cho người dùng và khách vãng lai (server cho phép người đã đặt đơn bằng cookie khách xem lại): danh sách sản phẩm gom theo cấu hình, phí, địa chỉ giao, OrderTimeline suy ra từ trạng thái (bước "Đang lắp ráp và kiểm tra" cho đơn nguyên bộ), nút "Thanh toán ngay" và "Hủy đơn" (hộp thoại xác nhận, gọi `POST /orders/:code/cancel`) khi đơn còn chờ thanh toán.
