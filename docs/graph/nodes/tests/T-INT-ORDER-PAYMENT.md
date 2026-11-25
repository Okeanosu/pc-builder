---
id: T-INT-ORDER-PAYMENT
type: test
title: "Integration test giỏ hàng - đặt hàng - webhook - PAID"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-04", "FR-05", "FR-06", "F-ORDER", "F-PAYMENT-VIETQR", "F-CART"]
code: []
tests: ["apps/api/src/modules/cart/**/*.int.test.ts", "apps/api/src/modules/orders/**/*.int.test.ts", "apps/api/src/modules/payments/**/*.int.test.ts"]
diagrams: []
---

Luồng đầy đủ: thêm vào giỏ (khách ở Redis, tài khoản ở DB, gộp giỏ khi đăng nhập, thêm cả cấu hình) → tạo đơn RETAIL/BUILD (giữ hàng, mã đơn, hạn giữ, xóa dòng đã đặt) → `GET /orders/:code/payment` trả URL VietQR → webhook SePay → đơn PAID, tồn kho trừ, `inventory_movements` ghi đúng, khóa giữ hàng bị xóa. Kèm các nhánh lỗi: giỏ trống, hết hàng giữa chừng (rollback mọi giữ hàng), quyền xem/hủy đơn.
