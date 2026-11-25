---
id: SCR-ADMIN-CHATLOGS
type: screen
title: "Admin: nhật ký chat"
status: done
chapters: ["CH4", "CH5"]
code: ["apps/web/src/app/admin/chats/**", "apps/web/src/features/admin/chats/**"]
tests: ["apps/web/src/features/admin/chats/**/*.test.ts"]
diagrams: []
---

**Route:** `/admin/chats`, `/admin/chats/[id]` (CSR)

Danh sách phiên lọc theo chế độ (AI Gemini / Dự phòng), có tiêu đề, người dùng, số tin nhắn, thời điểm bắt đầu và tin cuối. Trang chi tiết dựng lại hội thoại: tin của khách, câu trả lời của trợ lý (markdown, độ trễ, nhãn Dự phòng) và từng lần gọi công cụ dưới dạng thẻ thu gọn (tên công cụ, tóm tắt kết quả như "3 cấu hình", tham số một dòng; mở ra xem JSON đầy đủ của tham số và kết quả trả cho mô hình). Mã cấu hình được gợi ý là liên kết tới `/builds/[id]`. Cột "Chuỗi lập luận" liệt kê thứ tự các công cụ đã gọi để hội đồng thấy chatbot suy luận thế nào.

Ảnh: `chats-1440.png`, `chat-detail-1440.png`.
