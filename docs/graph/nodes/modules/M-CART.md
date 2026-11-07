---
id: M-CART
type: module
title: "Module cart: giỏ hàng Redis/DB và gộp giỏ"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["E-CART", "E-CART-ITEM", "M-BUILDS"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/cart/**"]
tests: ["apps/api/src/modules/cart/**/*.test.ts"]
diagrams: []
---

Giỏ khách vãng lai ở Redis (hash `cart:guest:{gid}`, 7 ngày), giỏ người dùng ở DB, gộp khi đăng nhập, thêm cả cấu hình, kiểm tra tồn kho khả dụng khi thêm. Cấu trúc: `cart.store.ts` (hai kho lưu cùng giao diện `CartStore`: Redis cho khách, `carts`/`cart_items` cho tài khoản; `claimGuestCart` đọc-và-xóa giỏ khách trong một `MULTI`), `cart.service.ts` (định giá bằng `effectivePrice`, kiểm tra tồn, gộp giỏ; được orders và quotes dùng lại), `cart.routes.ts`. `test-support.ts` là bộ dựng dữ liệu dùng chung cho integration test của các module thương mại.
