---
id: API-QUOTES
type: api
title: "API báo giá PDF"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-QUOTE-PDF"]
  dependsOn: ["M-QUOTES"]
code: ["apps/api/src/modules/quotes/**"]
tests: ["apps/api/src/modules/quotes/**/*.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/quotes/builds/:id.pdf`
- `GET /api/quotes/cart.pdf`

Trả `application/pdf` với `Content-Disposition: inline; filename="bao-gia-{id}.pdf"` (giỏ hàng: `bao-gia-gio-hang.pdf`). Cấu hình không tồn tại → 404; giỏ trống → `400 EMPTY_CART`.
