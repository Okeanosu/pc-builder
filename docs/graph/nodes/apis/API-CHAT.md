---
id: API-CHAT
type: api
title: "API chat và luồng SSE"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-AI-ADVISOR"]
  dependsOn: ["M-CHAT"]
code: ["apps/api/src/modules/chat/chat.routes.ts", "apps/api/src/modules/chat/chat.controller.ts", "apps/api/src/modules/chat/chat.service.ts"]
tests: ["apps/api/src/modules/chat/**/*.int.test.ts", "apps/api/src/modules/chat/chat.controller.test.ts"]
diagrams: ["docs/diagrams/seq-ai-advisor.mmd"]
---

**Endpoint:**
- `POST /api/chat/sessions` → 201 `ChatSessionDTO`; phiên thuộc người dùng đăng nhập hoặc khách (cookie `gid`); `mode` = AI khi có Gemini, ngược lại FALLBACK. Tối đa 10 phiên mới/phút cho mỗi người dùng, khách (theo cookie) hoặc IP (khi chưa có cookie), quá thì 429.
- `GET /api/chat/sessions/:id` → tin nhắn user và assistant theo thứ tự thời gian, câu trả lời kèm các cấu hình đã gợi ý (nạp lại từ bảng `builds`). Chỉ chủ phiên hoặc STAFF/ADMIN (chỉ đọc); người khác 403, id không tồn tại hoặc sai định dạng 404.
- `POST /api/chat/sessions/:id/messages` body `{text}` (1-1000 ký tự) → `text/event-stream`, mỗi sự kiện một dòng `data: <ChatEvent JSON>`.

Chỉ chủ phiên được gửi tin (STAFF/ADMIN cũng nhận 403 "Bạn không thể gửi tin vào cuộc trò chuyện này"). Thứ tự kiểm tra trước khi mở luồng: dữ liệu (422) → phiên và quyền ghi (404/403) → rate limit 10 tin/phút/người (429 JSON `RATE_LIMITED` kèm `Retry-After`). Luồng SSE phát lần lượt `session` → `tool` (start, nhãn "Đang tìm cấu hình tối ưu"...) → `builds`/`products` → `tool` (end) → `token`... → `done {messageId, mode}`; `done` chỉ được gửi sau khi lượt chat đã lưu xong, và `messageId` chính là id dòng assistant. Lỗi hệ thống giữa chừng → `error` rồi `done`, luồng luôn được đóng. Mỗi lượt lưu: tin nhắn user, mỗi tool call một dòng, câu trả lời (nội dung, `build_ids`, chế độ, `latency_ms`); lượt bị khách hủy trước khi có nội dung thì không lưu câu trả lời rỗng, và `GET` cũng bỏ qua câu trả lời rỗng.
