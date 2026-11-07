---
id: F-CART
type: feature
title: "Giỏ hàng (khách vãng lai ở Redis, người dùng ở DB, gộp khi đăng nhập)"
status: planned
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

**Mô tả:** khách vãng lai có giỏ ở Redis (`cart:guest:{guestId}`, 7 ngày); người dùng đăng nhập có giỏ trong `carts`/`cart_items`. Khi đăng nhập, giỏ tạm được gộp vào giỏ tài khoản. Thêm cả cấu hình qua `POST /cart/builds/:buildId` gắn `build_id` cho từng dòng để về sau tạo đơn nguyên bộ. Khóa duy nhất `(cart_id, product_id, build_id)` chặn dòng trùng.
