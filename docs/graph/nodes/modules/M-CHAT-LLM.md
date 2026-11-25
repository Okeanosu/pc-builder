---
id: M-CHAT-LLM
type: module
title: "Lớp trừu tượng LlmClient và bộ chọn nhà cung cấp"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-API-CORE"]
  decidedBy: ["ADR-003", "ADR-005"]
code: ["apps/api/src/modules/chat/llm/**"]
tests: ["apps/api/src/modules/chat/llm/**/*.test.ts"]
diagrams: []
---

Giao diện `LlmClient` che Gemini (`@google/genai`, model cấu hình qua `GEMINI_MODEL`) sau một interface nhỏ, nên integration test thay bằng LLM giả có kịch bản. `factory.ts` trả `undefined` khi chưa cấu hình khóa API, khiến hệ thống chạy ở chế độ dự phòng.
