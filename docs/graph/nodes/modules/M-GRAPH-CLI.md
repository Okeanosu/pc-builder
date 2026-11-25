---
id: M-GRAPH-CLI
type: module
title: "Công cụ tools/graph: nạp node, kiểm tra, sinh tài liệu"
status: done
chapters: ["CH4"]
links:
  decidedBy: ["ADR-010", "ADR-011"]
code: ["tools/graph/src/**"]
tests: ["tools/graph/src/*.test.ts"]
diagrams: []
---

Gói `@pc/graph`: `load.ts` (gray-matter + fast-glob + Zod), `validate.ts` (DUPLICATE_ID, BROKEN_LINK, MISSING_CODE, MISSING_TEST, MISSING_DIAGRAM, cảnh báo requirement chưa có tính năng/test), `trace.ts` (truy vết yêu cầu), các bộ sinh `emit-json`, `emit-traceability`, `emit-chapters`, `emit-html` và `cli.ts`.
