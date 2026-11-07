---
id: M-COMPATIBILITY
type: module
title: "Module compatibility: API kiểm tra tương thích"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["M-ENGINE", "M-CATALOG"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/compatibility/**"]
tests: ["apps/api/src/modules/compatibility/**/*.test.ts"]
diagrams: []
---

Nạp sản phẩm theo id, đổi sang `EngineProduct` và gọi bộ luật của Engine; trả `CompatibilityResultDTO`.
