---
id: T-INT-RECO
type: test
title: "Integration test gợi ý cấu hình"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-08", "F-RECOMMEND", "NFR-05"]
code: []
tests: ["apps/api/src/modules/recommendation/**/*.int.test.ts"]
diagrams: []
---

Mọi cấu hình trả về tương thích và trong ngân sách; linh kiện đều có trong kho; cache theo băm request; ngân sách quá thấp trả lý do.
