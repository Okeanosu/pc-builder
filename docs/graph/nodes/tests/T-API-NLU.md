---
id: T-API-NLU
type: test
title: "Unit test NLU dự phòng tiếng Việt (tối thiểu 40 câu)"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-17", "NFR-04", "ALG-NLU-FALLBACK", "F-FALLBACK-NLU"]
code: []
tests: ["apps/api/src/modules/chat/nlu/**/*.test.ts"]
diagrams: []
---

Bảng câu mẫu đa dạng cách viết ngân sách, mục đích, hãng, màu; kiểm tra các câu thiếu thông tin sinh câu hỏi lại.
