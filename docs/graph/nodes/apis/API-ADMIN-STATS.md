---
id: API-ADMIN-STATS
type: api
title: "API thống kê doanh thu"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-STATS"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/stats/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/admin/stats/revenue?from=&to=&groupBy=day|week|month`
- `GET /api/admin/stats/summary`
- `GET /api/admin/payments?status=&page=&pageSize=`

`revenue` trả mảng `RevenuePointDTO` (kỳ, doanh thu, số đơn) đã lấp kỳ trống; `summary` trả `AdminSummaryDTO`; `payments` trả danh sách `AdminPaymentDTO` để đối soát.
