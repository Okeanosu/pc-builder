---
id: T-API-ORDER-STATE
type: test
title: "Unit test máy trạng thái đơn hàng"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-05", "FR-15", "F-ORDER"]
code: []
tests: ["apps/api/src/modules/orders/**/*.test.ts"]
diagrams: []
---

Mọi cặp trạng thái (hợp lệ và không hợp lệ), hủy ở từng trạng thái, đơn BUILD so với RETAIL.
