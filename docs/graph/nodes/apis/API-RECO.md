---
id: API-RECO
type: api
title: "API gợi ý cấu hình"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-RECOMMEND"]
  dependsOn: ["M-RECOMMENDATION"]
code: ["apps/api/src/modules/recommendation/**"]
tests: ["apps/api/src/modules/recommendation/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/recommendations`

Nhận `{budget (5-200 triệu), purpose, preferences?, fixed?, exclude?}`, trả `RecommendationResultDTO` gồm 1-3 build và `stats` (số nút duyệt, số nhánh bị cắt, thời gian). Khi không khả thi trả `infeasibleReason` và `minFeasibleBudget`.
