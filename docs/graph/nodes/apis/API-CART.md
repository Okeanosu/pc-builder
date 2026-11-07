---
id: API-CART
type: api
title: "API giỏ hàng"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-CART"]
  dependsOn: ["M-CART"]
code: ["apps/api/src/modules/cart/**"]
tests: ["apps/api/src/modules/cart/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/cart`
- `POST /api/cart/items` (`{productId, qty}`, 201)
- `PATCH /api/cart/items/:id` (`{qty}`)
- `DELETE /api/cart/items/:id`
- `POST /api/cart/builds/:buildId` (201)

Trả `CartDTO` (dòng hàng, tạm tính, số lượng). Khách vãng lai nhận diện qua cookie `gid`; id dòng của khách là `{productId}:{buildId|-}`, của tài khoản là id `cart_items`. Lỗi: `404` sản phẩm/cấu hình không tồn tại, `409 INSUFFICIENT_STOCK` (kèm `productId`, `name`, `requested`, `available`), `422` số lượng ngoài 1..20.
