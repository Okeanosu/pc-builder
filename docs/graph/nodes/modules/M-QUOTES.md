---
id: M-QUOTES
type: module
title: "Module quotes: xuất báo giá PDF"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["M-BUILDS", "M-CART"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/quotes/**"]
tests: ["apps/api/src/modules/quotes/**/*.test.ts"]
diagrams: []
---

Dựng PDF bằng pdfkit với font DejaVu cho tiếng Việt; trả file `application/pdf`.
