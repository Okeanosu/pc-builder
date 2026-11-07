---
id: F-SPEC-GRAPH
type: feature
title: "Spec-Code Graph: truy vết yêu cầu - code - test - báo cáo"
status: done
chapters: ["CH4"]
links:
  realizes: ["NFR-09"]
  dependsOn: ["M-GRAPH-CLI"]
  decidedBy: ["ADR-010", "ADR-011"]
code: ["tools/graph/src/**", "docs/graph/README.md", "docs/graph/nodes/**"]
tests: ["tools/graph/src/*.test.ts"]
diagrams: []
---

**Mục đích:** một nguồn truy vết duy nhất để viết báo cáo mà không bị lệch với code.

**Mô tả:** mỗi yếu tố của hệ thống là một file Markdown (node) có frontmatter mô tả liên kết; CLI `pnpm graph` sinh `graph.json`, `graph.mmd`, `traceability.md`, `coverage.md`, `chapters/CH1..CH6.md` và `index.html` (viewer Cytoscape). `pnpm graph:check` (nằm trong `pnpm verify`) bắt lỗi trùng id, liên kết hỏng, node `done` mà không còn file code/test.

**Quyết định chính:** ADR-010 dùng Markdown + frontmatter để diff/review được; ADR-011 không ghi mã spec vào comment code - ánh xạ nằm ở node.
