---
id: T-INT-CHAT
type: test
title: "Integration test chat với LLM giả và chế độ dự phòng"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-07", "FR-17", "NFR-05", "F-AI-ADVISOR"]
code: []
tests: ["apps/api/src/modules/chat/**/*.int.test.ts"]
diagrams: []
---

LLM giả qua giao diện `LlmClient` phát kịch bản function call; kiểm tra thứ tự sự kiện SSE, build card dựng từ dữ liệu tool, giới hạn 4 vòng, rate limit, và chuyển sang dự phòng khi LLM ném lỗi 429/timeout.
