---
id: CH5
type: chapter
title: "Chương 5 - Giải pháp và đóng góp nổi bật"
status: planned
chapters: []
code: []
tests: []
diagrams: []
---

**Nội dung cần viết:** mỗi mục là một đóng góp, trình bày vấn đề → giải pháp → kết quả đo được.
1. **Optimization Engine: CSP + MCKP** - mô hình hóa, AC-3, Forward Checking, Branch and Bound, số liệu so sánh 4 biến thể (T-ENGINE-BENCH).
2. **AI PC Advisor** - kiến trúc chống ảo giác (LLM điều phối, Engine quyết định), guardrails, kết quả golden set.
3. **Chế độ dự phòng** - NLU tiếng Việt theo luật, không phụ thuộc quota.
4. **Chống bán vượt tồn kho** - UPDATE có điều kiện, giữ hàng 15 phút, thí nghiệm đặt hàng đồng thời.
5. **Thông số động với JSONB + GIN** - form schema động, truy vấn chứa, EXPLAIN chọn `products_specs_gin` (F-CATALOG).
6. **Các quyết định rút ra khi phát triển (ADR-012 đến ADR-021)** - chấm điểm theo mức đủ dùng, hệ số CUDA, luật mềm C15, khóa cache có phiên bản, JWT có `typ` và chính sách refresh-race, `orders.guest_id` cùng khóa checkout, phân tích ngân sách tiếng Việt, báo cáo điểm hai mức, hợp đồng nhãn top-K, lưu giao dịch không khớp đơn và xác nhận tay chỉ ADMIN. Mỗi mục: tình huống phát hiện (lỗi hoặc hành vi lạ khi chạy thử), quyết định, kết quả đo.

**Nguồn trong graph:** các node gắn nhãn CH5 (tính năng, thuật toán, quyết định, test) bên dưới.
