---
id: F-AI-ADVISOR
type: feature
title: "AI PC Advisor: chatbot Gemini điều phối Engine qua function calling"
status: done
chapters: ["CH1", "CH4", "CH5"]
links:
  realizes: ["FR-07", "UC-03", "NFR-02", "NFR-05"]
  dependsOn: ["M-CHAT", "M-CHAT-LLM", "F-ENGINE-CORE", "F-FALLBACK-NLU", "F-RECOMMEND", "E-CHAT-SESSION", "E-CHAT-MESSAGE"]
  decidedBy: ["ADR-003", "ADR-004", "ADR-005"]
  shownIn: ["SCR-ADVISOR", "SCR-HOME", "SCR-ADMIN-CHATLOGS"]
code: ["apps/api/src/modules/chat/**", "apps/web/src/features/advisor/**", "apps/web/src/stores/chat.ts", "apps/web/src/components/ChatWidget.tsx"]
tests: ["apps/api/src/modules/chat/**/*.test.ts", "apps/api/src/modules/chat/**/*.int.test.ts", "apps/api/eval/**", "apps/web/src/features/advisor/**/*.test.ts", "apps/web/src/stores/chat.test.ts"]
diagrams: ["docs/diagrams/seq-ai-advisor.mmd"]
---

**Mục đích:** tính năng nổi bật của hệ thống - người dùng nói nhu cầu bằng tiếng Việt, nhận cấu hình thật trong kho thay vì tự học thuật ngữ phần cứng.

**Trạng thái:** đã xong cả API (module chat, 5 tool, luồng SSE, lưu hội thoại, đánh giá golden set) và giao diện web (`/advisor`, widget chat nổi; chi tiết ở SCR-ADVISOR). Đã chạy thử đầu-cuối ở chế độ dự phòng: "chơi game 25 triệu" → chip công cụ → 3 BuildCard → "Mở trong Customizer" nạp đủ 8 linh kiện không lỗi.

**Mô tả:** API `POST /chat/sessions/:id/messages` trả luồng SSE. Orchestrator gửi 20 dòng lịch sử gần nhất và system prompt kèm 5 tool cho Gemini (`recommend_builds`, `search_products`, `get_product_details`, `check_compatibility`, `modify_build`). Khi model gọi tool, API chạy Engine/DB thật và trả về cho model bản tóm tắt gọn (id, nhãn, tổng giá, tên và giá linh kiện, phân bổ, cảnh báo - không kèm toàn bộ thông số); thẻ cấu hình được gửi riêng tới web qua sự kiện `builds` từ dữ liệu tool nên giá luôn đúng. `modify_build` giữ nguyên mọi linh kiện trừ danh mục cần đổi, giải lại bằng Engine; nếu giữ nguyên làm bài toán vô nghiệm thì thử lại và cho đổi thêm các linh kiện phụ thuộc (ví dụ đổi card thì được đổi nguồn, vỏ case) rồi báo rõ cho khách. Giới hạn 4 vòng tool mỗi lượt, timeout 20 giây, rate limit 10 tin/phút, cache kết quả gợi ý theo băm tham số 10 phút. Toàn bộ hội thoại và tool call được lưu để xem lại và phân tích.

**Quyết định chính:** ADR-003 chọn Gemini free tier với function calling; ADR-004 LLM chỉ điều phối, Engine quyết định; ADR-005 chế độ dự phòng khi Gemini không dùng được. Khai báo tool chỉ dùng tập con JSON Schema mà Gemini chấp nhận (bộ lọc thông số của `search_products` là danh sách cặp `{key, value}` thay vì object tự do), có unit test kiểm tra.

**Điểm nhấn cho báo cáo (CH5):** kiến trúc chống ảo giác (guardrails), so sánh với chatbot thuần LLM, kết quả golden-set 30 kịch bản (`apps/api/eval/results.md`). Lần chạy ở chế độ dự phòng: gọi đúng tool 30/30, tham số đúng 25/25, 69/69 cấu hình trả về hợp lệ khi kiểm tra lại bằng bộ luật C01–C14, độ trễ p50 10 ms / p95 25 ms. Chế độ Gemini thật cần khóa API: chạy `eval/smoke-gemini.ts` rồi `eval:ai`.
