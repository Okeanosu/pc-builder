---
id: T-INT-CATALOG
type: test
title: "Integration test lọc JSONB và facet"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-01", "FR-02", "F-CATALOG"]
code: []
tests: ["apps/api/src/modules/catalog/**/*.int.test.ts"]
diagrams: []
---

Lọc theo `specs[socket]`, hãng, giá; phân trang và sắp xếp; facet khớp `specSchema`.
