---
id: M-CHAT
type: module
title: "Module chat: phiên chat, SSE, orchestrator Gemini và chế độ dự phòng"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-CHAT-LLM", "M-RECOMMENDATION", "M-COMPATIBILITY", "M-CATALOG", "M-BUILDS", "E-CHAT-SESSION", "E-CHAT-MESSAGE"]
  decidedBy: ["ADR-002", "ADR-018"]
code: ["apps/api/src/modules/chat/**"]
tests: ["apps/api/src/modules/chat/**/*.test.ts"]
diagrams: ["docs/diagrams/seq-ai-advisor.mmd"]
---

Quản lý `chat_sessions` và `chat_messages`, phát luồng SSE theo các sự kiện của `@pc/shared`, điều phối vòng lặp tool-calling (tối đa 4 vòng), rate limit Redis 10 tin/phút và 10 phiên mới/phút, chuyển sang NLU dự phòng khi cần.

**Cấu trúc file:**
- `chat.routes.ts`: 3 endpoint, kiểm tra quyền sở hữu phiên (người dùng theo `user_id`, khách theo cookie `gid`; STAFF/ADMIN chỉ được xem, không được gửi tin vào phiên của khách) và rate limit trước khi mở luồng SSE.
- `chat.controller.ts`: một lượt chat - lưu tin nhắn user, phát `session`, gọi `runTurn`, lưu tool call và câu trả lời rồi mới phát `done`; lỗi không phải của LLM thành sự kiện `error` + `done`; khách ngắt kết nối thì hủy lượt (AbortController gắn với sự kiện `close` của response, và kiểm tra ngay nếu response đã đóng trước đó). Lượt bị hủy khi chưa có chữ hay build nào thì không lưu câu trả lời rỗng.
- `chat.service.ts`: truy cập DB/Redis - tạo phiên, đặt tiêu đề (60 ký tự đầu của tin nhắn đầu tiên), lưu mỗi tool call một dòng (`tool_name`, `tool_args`, `tool_result` = dữ liệu đã gửi model, `build_ids`), cập nhật `chat_sessions.mode` theo lượt gần nhất, rate limit `rl:chat:{who}:{phút}` (tin nhắn) và `rl:chat-session:{who}:{phút}` (tạo phiên; khách chưa có cookie tính theo IP) bằng INCR + EXPIRE, ý định dự phòng của phiên ở `chat:intent:{sessionId}` (TTL 1 ngày).
- `chat.history.ts`: dựng lại lịch sử cho model từ 20 dòng gần nhất (user → phần text của user, assistant → text của model, mỗi tool → `functionCall` của model rồi `functionResponse` của user), luôn bắt đầu bằng lượt user và gộp các lượt cùng vai liên tiếp.
- `orchestrator.ts`, `prompts.ts`, `sse.ts`, `llm/*`, `fallback/*`: lõi hội thoại (vòng lặp tool, prompt hệ thống, ghi SSE có heartbeat, client Gemini, NLU và câu trả lời theo mẫu).
- `tools/*`: 5 tool trên các service thật (`registry.ts` lắp ráp). `recommend_builds` kẹp ngân sách vào khoảng 5-200 triệu và báo cho model khi phải kẹp, đổi mã lý do vô nghiệm sang tiếng Việt (kể cả `SEARCH_LIMIT` → lời mời thử lại); `search_products` tối đa 8 sản phẩm còn hàng; `get_product_details` thông số chính + benchmark; `check_compatibility` lỗi/cảnh báo, công suất ước tính, danh mục còn thiếu; `modify_build` giải lại với các linh kiện còn lại cố định. Yêu cầu gốc (ngân sách, mục đích, sở thích) của mỗi build chat được nhớ ở `chat:build-request:{buildId}` để `modify_build` giữ được sở thích mà bảng `builds` không lưu.
