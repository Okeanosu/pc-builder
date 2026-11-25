---
id: T-GRAPH-CLI
type: test
title: "Unit test CLI Spec-Code Graph"
status: done
chapters: ["CH4"]
links:
  verifies: ["F-SPEC-GRAPH", "M-GRAPH-CLI", "NFR-09"]
code: []
tests: ["tools/graph/src/*.test.ts"]
diagrams: []
---

Kiểm tra bộ nạp node, các mã lỗi của `validate` (DUPLICATE_ID, BROKEN_LINK, MISSING_CODE, MISSING_TEST...), bảng truy vết một dòng một yêu cầu, tệp chương liệt kê đủ node, viewer HTML nhúng dữ liệu an toàn.
