---
id: API-ADMIN-CHATS
type: api
title: "API xem nhật ký chat (quản trị)"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-AI-ADVISOR"]
  dependsOn: ["M-ADMIN", "E-CHAT-SESSION", "E-CHAT-MESSAGE"]
code: ["apps/api/src/modules/admin/chats/**"]
tests: ["apps/api/src/modules/admin/chats/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/admin/chats?mode=AI|FALLBACK&page=&pageSize=` (`Paginated<ChatLogSummaryDTO>`: tiêu đề, chế độ, email hoặc guestId, số tin nhắn, thời điểm tin cuối)
- `GET /api/admin/chats/:id` (`ChatLogDetailDTO`: toàn bộ tin nhắn theo thứ tự, gồm tool call với tham số, kết quả, độ trễ)

Phục vụ màn hình SCR-ADMIN-CHATLOGS để phân tích chất lượng trợ lý AI và chế độ dự phòng. Chỉ STAFF/ADMIN.
