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

Giỏ khách vãng lai ở Redis (hash `cart:guest:{gid}`, 7 ngày), giỏ người dùng ở DB, gộp khi đăng nhập, thêm cả cấu hình, kiểm tra tồn kho khả dụng khi thêm. Cấu trúc: `cart.store.ts` (hai kho lưu cùng giao diện `CartStore` với thao tác `write` nguyên tử: giỏ khách dùng một Lua script trong Redis kiểm tra giới hạn 20/dòng và tồn khả dụng rồi `HINCRBY`/`HSET` trong cùng một bước; giỏ tài khoản khóa dòng `carts` bằng `SELECT … FOR UPDATE` rồi `INSERT … ON CONFLICT DO UPDATE SET qty = LEAST(qty + excluded.qty, 20)`), `redis-lock.ts` (khóa ngắn `SET NX PX`, chỉ chủ khóa mới xóa được), `cart.service.ts` (định giá bằng `effectivePrice`, kiểm tra tồn, gộp giỏ: upsert DB (cũng khóa dòng `carts` trước) rồi mới trừ khỏi Redis đúng số lượng đã đọc bằng Lua `HINCRBY` âm và xóa field ≤ 0, bỏ qua sản phẩm đã ẩn, có khóa chống gộp hai lần; id sản phẩm luôn dùng dạng chuẩn từ DB; được orders và quotes dùng lại), `cart.routes.ts`. Bộ dựng dữ liệu dùng chung cho integration test nằm ở `apps/api/test/test-support.ts`.
