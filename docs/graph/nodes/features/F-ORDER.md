---
id: F-ORDER
type: feature
title: "Đặt hàng lẻ / nguyên bộ và vòng đời đơn"
status: planned
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

**Mô tả:** `POST /orders` tính lại giá từ DB, tạo đơn RETAIL hoặc BUILD (cộng `ASSEMBLY_FEE` với đơn nguyên bộ), lưu ảnh chụp tên và giá từng dòng (`name_snapshot`, `price_snapshot`) để lịch sử không đổi khi giá đổi. Vòng đời được định nghĩa trong máy trạng thái `orders.state.ts` (xem sơ đồ): chỉ cho phép các chuyển trạng thái hợp lệ; hủy khi PAID cần hoàn tiền thủ công.
