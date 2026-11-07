---
id: SCR-ADMIN-ORDERS
type: screen
title: "Admin: đơn hàng"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/admin/orders/**", "apps/web/src/features/admin/orders/**", "apps/web/src/features/admin/OrderStatusControl.tsx"]
tests: ["apps/web/src/features/admin/orders/**/*.test.ts"]
diagrams: []
---

**Route:** `/admin/orders`, `/admin/orders/[code]` (CSR)

Danh sách lọc theo trạng thái, loại đơn (mua lẻ/nguyên bộ), tìm theo mã đơn, số điện thoại hoặc tên; phân trang, tự làm mới.

Chi tiết đơn: sản phẩm (nhóm theo bộ PC, liên kết `/builds/[id]`), tạm tính, phí lắp ráp, phí vận chuyển, tổng; bảng đối soát VietQR liệt kê từng giao dịch (nguồn SePay hoặc giả lập, nội dung chuyển khoản, số tiền, kết quả Khớp/Chuyển thiếu/Cần đối soát tay) và tóm tắt đã khớp hay chưa; `OrderTimeline` (chấm 8 px, bước hiện tại màu accent). `OrderStatusControl` chỉ hiện các bước chuyển hợp lệ theo bản sao máy trạng thái phía client (server vẫn là nơi quyết định, lỗi 409 sẽ tải lại đơn); hủy hoặc xác nhận tiền thủ công cần xác nhận ngay trên trang; xác nhận tiền thủ công và hủy đơn đã thanh toán chỉ ADMIN làm được, STAFF thấy nút khóa kèm lý do.

Ảnh: `orders-1440.png`, `order-shipping-1440.png`, `order-staff-cancel-locked-1440.png` (đơn đã thanh toán, STAFF thấy nút hủy bị khóa).
