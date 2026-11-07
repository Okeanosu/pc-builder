---
id: API-ADMIN-STATS
type: api
title: "API thống kê doanh thu"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-STATS"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/stats/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/admin/stats/revenue?from=&to=&groupBy=`

Trả mảng `RevenuePointDTO` (kỳ, doanh thu, số đơn).
