---
id: API-CHAT
type: api
title: "API chat và luồng SSE"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-AI-ADVISOR"]
  dependsOn: ["M-CHAT"]
code: ["apps/api/src/modules/chat/**"]
tests: ["apps/api/src/modules/chat/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/chat/sessions`
- `GET /api/chat/sessions/:id`
- `POST /api/chat/sessions/:id/messages (text/event-stream)`

Luồng SSE phát lần lượt các sự kiện `session`, `tool` (start/end kèm nhãn "Đang tìm linh kiện..."), `builds`, `products`, `token`, `error`, `done` - định nghĩa ở `@pc/shared` (`ChatEvent`). Rate limit 10 tin/phút/người.
