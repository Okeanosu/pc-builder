---
id: T-PERF-ENGINE
type: test
title: "Hiệu năng API gợi ý (autocannon)"
status: planned
chapters: ["CH4"]
links:
  verifies: ["NFR-01", "F-RECOMMEND"]
code: []
tests: ["apps/api/perf/**"]
diagrams: []
---

Đo độ trễ `POST /recommendations` (p50/p95/p99) theo kích thước catalog; so sánh có và không có cache. Số liệu cho chương 4.
