---
id: E-CHAT-MESSAGE
type: entity
title: "Tin nhắn chat"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `chat_messages`

Vai trò user/assistant/tool, nội dung, và với tool call: tên tool, tham số và kết quả (JSONB); `build_ids` các cấu hình sinh ra, chế độ, độ trễ (`latency_ms`). Với câu trả lời ở chế độ AI, `price_check` (JSONB, migration `0002_chat_price_check`) ghi kết quả kiểm tra giá phía server: số lượng số tiền VND trong câu trả lời và các số không khớp dữ liệu tool (`{mentions, unmatched: [{text, amount}]}`); NULL khi không kiểm tra (chế độ dự phòng). Phục vụ xem lại và đánh giá chất lượng AI.
