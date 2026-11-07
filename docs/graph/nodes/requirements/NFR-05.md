---
id: NFR-05
type: requirement
title: "Tính đúng đắn dữ liệu: AI không được bịa linh kiện hoặc giá"
status: done
chapters: ["CH2"]
code: ["apps/api/src/modules/chat/price-check.ts", "apps/api/src/modules/chat/prompts.ts"]
tests: ["apps/api/src/modules/chat/price-check.test.ts"]
diagrams: []
---

**Nguồn:** spec §1 (anti-goal).

Yêu cầu được đáp ứng theo hai mức, và báo cáo cần phân biệt rõ:

1. **Được bảo đảm (bằng cấu trúc):** thẻ cấu hình (BuildCard) cùng giá từng linh kiện và tổng giá được dựng từ dữ liệu tool, tức là từ Engine và cơ sở dữ liệu, không từ văn bản LLM; nên giá hiển thị trên thẻ luôn khớp giá trong DB. Mọi cấu hình trả về đều tương thích 100% và nằm trong ngân sách (Engine kiểm tra, golden set kiểm lại 69/69).
2. **Được ràng buộc và giám sát (không bảo đảm):** văn bản tự do của LLM bị ràng buộc bằng system prompt (chỉ được nêu sản phẩm và giá lấy nguyên văn từ kết quả tool) và được **giám sát** bằng bộ kiểm tra giá phía server (`price-check.ts`): sau mỗi lượt ở chế độ AI, server trích các số tiền VND trong câu trả lời (`25.000.000₫`, `25 triệu`, `25tr`…) và so với tập số mà tool đã trả về (giá, tổng giá, ngân sách, `minFeasibleBudget`, số tiền suy ra từ tỷ lệ phân bổ, phần ngân sách còn dư, chênh lệch giữa các cấu hình; sai số ±1% hoặc làm tròn tới triệu). Số không khớp được ghi vào `chat_messages.price_check` và log cảnh báo; **văn bản không bị sửa hay chặn**, nên đây là giám sát chứ không phải bảo đảm.

**Hiện trạng đánh giá:** chế độ AI (Gemini) **chưa được đánh giá trực tiếp** vì chưa có khóa API; chỉ số "price-mention mismatch rate" trong `pnpm --filter @pc/api eval:ai` sẽ đo khi chạy với khóa. Hiệu chỉnh bộ trích số trên 33 câu trả lời của chế độ dự phòng (sinh từ dữ liệu tool, ngày 2026-11-08): 98 số tiền được trích, 2 bị gắn cờ, cả hai là số ví dụ "25 triệu" trong câu hỏi lại ngân sách (không phải giá), 0 trường hợp đọc sai số.
