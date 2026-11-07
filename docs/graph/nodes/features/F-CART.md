---
id: F-CART
type: feature
title: "Giỏ hàng (khách vãng lai ở Redis, người dùng ở DB, gộp khi đăng nhập)"
status: in-progress
chapters: ["CH4"]
links:
  realizes: ["FR-04", "UC-08"]
  dependsOn: ["M-CART", "E-CART", "E-CART-ITEM", "F-BUILD-SHARE"]
  shownIn: ["SCR-CART"]
code: ["apps/api/src/modules/cart/**", "apps/web/src/features/cart/**"]
tests: ["apps/api/src/modules/cart/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** gom linh kiện lẻ và cả cấu hình trước khi đặt.

**Mô tả:** khách vãng lai có giỏ ở Redis: hash `cart:guest:{guestId}`, mỗi field `{productId}:{buildId|-}` → số lượng, TTL trượt 7 ngày. Người dùng đăng nhập có giỏ trong `carts`/`cart_items`. Ở request giỏ hàng đầu tiên có token kèm cookie `gid`, giỏ tạm được đọc và xóa trong một lệnh `MULTI` (hai request đồng thời không gộp hai lần) rồi gộp vào giỏ tài khoản: cộng số lượng, tối đa 20 mỗi dòng. `POST /cart/builds/:buildId` đọc cấu hình đã lưu và thêm từng linh kiện với `build_id` (thêm lại không nhân đôi). Giá dòng luôn là `effectivePrice` lấy từ DB; số lượng vượt tồn khả dụng (`stock - reserved`, tính trên mọi dòng cùng sản phẩm) bị từ chối `409 INSUFFICIENT_STOCK`.

**Trạng thái:** phần API đã xong và có integration test; giao diện giỏ hàng (web) chưa làm.
