---
id: API-ADMIN-INVENTORY
type: api
title: "API quản trị tồn kho và benchmark"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-INVENTORY"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/inventory/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/admin/inventory/:productId/adjust` (`{delta, reason: IMPORT|ADJUST, note?}`)
- `GET /api/admin/inventory/:productId/movements?page=&pageSize=`
- `GET /api/admin/benchmarks?category=`
- `GET/PUT /api/admin/benchmarks/:productId`

Điều chỉnh tồn kho luôn ghi `inventory_movements` và không cho tồn kho thấp hơn `reserved` (`409 STOCK_BELOW_RESERVED`). Trả `{product: AdminProductDTO, movement: InventoryMovementDTO}`; benchmark trả `BenchmarkDTO`.
