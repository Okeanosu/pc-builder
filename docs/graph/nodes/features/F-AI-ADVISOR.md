---
id: F-AI-ADVISOR
type: feature
title: "AI PC Advisor: chatbot Gemini điều phối Engine qua function calling"
status: planned
chapters: ["CH1", "CH4", "CH5"]
links:
  realizes: ["FR-07", "UC-03", "NFR-02", "NFR-05"]
  dependsOn: ["M-CHAT", "M-CHAT-LLM", "F-ENGINE-CORE", "F-FALLBACK-NLU", "F-RECOMMEND", "E-CHAT-SESSION", "E-CHAT-MESSAGE"]
  decidedBy: ["ADR-003", "ADR-004", "ADR-005"]
  shownIn: ["SCR-ADVISOR", "SCR-HOME", "SCR-ADMIN-CHATLOGS"]
code: ["apps/api/src/modules/chat/**", "apps/web/src/features/advisor/**"]
tests: ["apps/api/src/modules/chat/**/*.test.ts", "apps/api/src/modules/chat/**/*.int.test.ts"]
diagrams: ["docs/diagrams/seq-ai-advisor.mmd"]
---

**Mục đích:** tính năng nổi bật của hệ thống - người dùng nói nhu cầu bằng tiếng Việt, nhận cấu hình thật trong kho thay vì tự học thuật ngữ phần cứng.

**Mô tả:** API `POST /chat/sessions/:id/messages` trả luồng SSE. Orchestrator gửi lịch sử và system prompt kèm 5 tool cho Gemini (`recommend_builds`, `search_products`, `get_product_details`, `check_compatibility`, `modify_build`). Khi model gọi tool, API chạy Engine/DB thật và trả kết quả tóm tắt về cho model; thẻ cấu hình được gửi riêng tới web từ dữ liệu tool nên giá luôn đúng. Giới hạn 4 vòng tool mỗi lượt, timeout 20 giây, rate limit 10 tin/phút, cache kết quả tool theo băm tham số 10 phút. Toàn bộ hội thoại và tool call được lưu để xem lại và phân tích.

**Quyết định chính:** ADR-003 chọn Gemini free tier với function calling; ADR-004 LLM chỉ điều phối, Engine quyết định; ADR-005 chế độ dự phòng khi Gemini không dùng được.

**Điểm nhấn cho báo cáo (CH5):** kiến trúc chống ảo giác (guardrails), so sánh với chatbot thuần LLM, kết quả golden-set 30 kịch bản.
