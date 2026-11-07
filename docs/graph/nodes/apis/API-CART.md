---
id: API-CART
type: api
title: "API giỏ hàng"
status: planned
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
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `POST /api/cart/builds/:buildId`

Trả `CartDTO` (dòng hàng, tạm tính, số lượng). Khách vãng lai nhận diện qua `guestId`.
