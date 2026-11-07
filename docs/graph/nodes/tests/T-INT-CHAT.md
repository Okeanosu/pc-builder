---
id: T-INT-CHAT
type: test
title: "Integration test chat với LLM giả và chế độ dự phòng"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-07", "FR-17", "NFR-05", "F-AI-ADVISOR"]
code: []
tests: ["apps/api/src/modules/chat/**/*.int.test.ts", "apps/api/src/modules/chat/chat.controller.test.ts"]
diagrams: []
---

`chat.int.test.ts` chạy trên Postgres `pcbuilder_test` và Redis db 1 với dữ liệu seed; LLM giả (giao diện `LlmClient`) phát kịch bản function call:
- Thứ tự sự kiện SSE `session → tool(start) → builds → tool(end) → token+ → done{AI}`; build card là build thật trong ngân sách, đã lưu với nguồn CHAT.
- Dòng lưu trong `chat_messages`: user, một dòng mỗi tool call (tên, tham số, kết quả gửi model, `build_ids`), assistant (id = `messageId` của `done`, nội dung, chế độ, độ trễ); tiêu đề phiên, chế độ phiên, ý định lưu ở Redis.
- Lượt sau dựng lại lịch sử từ các dòng đã lưu (user → functionCall → functionResponse → text → user).
- `GET` trả tin nhắn kèm cấu hình và bỏ qua câu trả lời rỗng; khách khác 403, STAFF 200, id lạ 404; phiên của người dùng đăng nhập không cho khách xem.
- STAFF gửi tin vào phiên của khách → 403, không ghi dòng nào, chế độ phiên không đổi.
- Rate limit: tin thứ 11 trong một phút bị 429 JSON trước khi mở luồng, khách khác không bị ảnh hưởng; phiên mới thứ 11 trong một phút bị 429 (theo cookie, hoặc theo IP khi không có cookie), người dùng đăng nhập tính riêng.
- Gemini báo 429 → trả lời bằng chế độ dự phòng, `done.mode` và `chat_sessions.mode` = FALLBACK.
- Khách ngắt kết nối giữa chừng → tín hiệu hủy tới LLM, chỉ lưu tin nhắn user (không lưu câu trả lời rỗng); tin nhắn tiếp theo được gộp vào lượt user còn treo nên lịch sử gửi model vẫn xen kẽ user/model và mỗi `functionCall` đều có `functionResponse` theo sau.
- Không có LLM: "chơi game 25 triệu" → sự kiện `builds` và `done{FALLBACK}`; thiếu thông tin → câu hỏi lại, không có build.

`tools/registry.int.test.ts` kiểm tra 5 tool trên service thật (tìm kiếm ≤ 8 sản phẩm còn hàng, lọc thông số, chi tiết + benchmark, lỗi tương thích tiếng Việt, gợi ý và chỉnh cấu hình bằng Engine). `chat.controller.test.ts` kiểm tra nhánh lỗi: lỗi không phải LLM hoặc lỗi lưu DB → `error` rồi `done`, luồng luôn đóng.
