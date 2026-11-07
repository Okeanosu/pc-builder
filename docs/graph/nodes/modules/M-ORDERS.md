---
id: M-ORDERS
type: module
title: "Module orders: tạo đơn, máy trạng thái, giữ hàng, sweeper"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["E-ORDER", "E-ORDER-ITEM", "E-PRODUCT", "E-INVENTORY-MOVEMENT", "M-CART"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/orders/**", "apps/api/src/jobs/**"]
tests: ["apps/api/src/modules/orders/**/*.test.ts", "apps/api/src/jobs/**/*.test.ts"]
diagrams: []
---

Chứa `orders.state.ts` (bảng chuyển trạng thái, `assertTransition`, `inventoryEffect` và `applyTransition` - đường duy nhất đổi trạng thái, UPDATE có điều kiện trạng thái kèm hiệu ứng kho trong cùng transaction), `orders.service.ts` (giữ hàng bằng UPDATE có điều kiện theo thứ tự `product_id`, tính phí lắp ráp, snapshot tên/giá, chống đặt trùng bằng khóa dòng `carts` hoặc khóa Redis `lock:checkout:{gid}`, phân quyền xem đơn theo `user_id`/`guest_id`, việc Redis sau commit không làm hỏng đơn đã tạo, danh sách đơn), `order-code.ts` (sinh và nhận diện mã `PCB` + 8 ký tự base32) và `orders.routes.ts`. Job `apps/api/src/jobs/order-expiry.ts` (`expirePendingOrders`, `startOrderExpiryJob` chạy mỗi 60 giây, khởi động và dừng cùng `server.ts`) hủy đơn quá hạn giữ hàng và nhả `reserved`; mỗi đơn xử lý trong try/catch riêng nên một đơn lỗi không chặn các đơn khác hay bước dọn dẹp sau commit.
