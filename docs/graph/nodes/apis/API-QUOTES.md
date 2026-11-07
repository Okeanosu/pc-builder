---
id: API-QUOTES
type: api
title: "API báo giá PDF"
status: planned
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

Trả `application/pdf`.
