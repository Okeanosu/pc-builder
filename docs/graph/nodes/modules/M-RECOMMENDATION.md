---
id: M-RECOMMENDATION
type: module
title: "Module recommendation: API gợi ý cấu hình"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["M-ENGINE", "M-CATALOG", "E-PURPOSE-WEIGHT", "E-BUILD"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/recommendation/**"]
tests: ["apps/api/src/modules/recommendation/**/*.test.ts"]
diagrams: []
---

Nạp ứng viên và trọng số, gọi `solve`, lưu build, cache kết quả theo băm request. Đây cũng là nơi tool `recommend_builds` của chatbot gọi vào.
