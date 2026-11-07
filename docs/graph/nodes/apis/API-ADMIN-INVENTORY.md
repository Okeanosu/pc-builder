---
id: API-ADMIN-INVENTORY
type: api
title: "API quản trị tồn kho và benchmark"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-INVENTORY"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/inventory/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/admin/inventory/:productId/adjust`
- `GET/PUT /api/admin/benchmarks`

Điều chỉnh tồn kho luôn ghi `inventory_movements`.
