---
id: M-CHAT
type: module
title: "Module chat: phiên chat, SSE, orchestrator Gemini và chế độ dự phòng"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["M-CHAT-LLM", "M-RECOMMENDATION", "M-COMPATIBILITY", "M-CATALOG", "E-CHAT-SESSION", "E-CHAT-MESSAGE"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/chat/**"]
tests: ["apps/api/src/modules/chat/**/*.test.ts"]
diagrams: []
---

Quản lý `chat_sessions` và `chat_messages`, phát luồng SSE theo các sự kiện của `@pc/shared`, điều phối vòng lặp tool-calling (tối đa 4 vòng), rate limit Redis 10 tin/phút, chuyển sang NLU dự phòng khi cần.
