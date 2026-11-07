---
id: SCR-ADVISOR-FORM
type: screen
title: "Form gợi ý nhanh trên /advisor"
status: done
chapters: ["CH4"]
code: ["apps/web/src/features/advisor/QuickRecommendForm.tsx", "apps/web/src/features/advisor/quick-form.ts", "apps/web/src/app/*/advisor/**"]
tests: ["apps/web/src/features/advisor/quick-form.test.ts"]
diagrams: []
---

**Route:** `/advisor` (CSR), tab/khối "Gợi ý nhanh" cạnh khung chat.

Khách không cần gõ câu: chọn mục đích (Gaming, Đồ họa, AI, Văn phòng), kéo thanh ngân sách hoặc nhập số triệu đồng, tùy chọn hãng GPU, kích cỡ case (form factor) và các lựa chọn phụ rồi bấm gửi. Giao diện gọi `POST /recommendations` (gói `RecommendationRequest`) và hiện đúng ba `BuildDTO` dưới dạng thẻ so sánh giống phần chat, không qua Gemini nên nhanh và ổn định khi LLM không khả dụng.

**Kiểm tra đầu vào:** hàm thuần `validateQuickForm` giới hạn ngân sách trong khoảng cho phép (`BUDGET_MIN_M` đến `BUDGET_MAX_M` triệu), `parseBudgetMillions` đọc cả dấu phẩy/chấm, lỗi hiện ngay dưới ô nhập bằng tiếng Việt.

**Trường hợp không khả thi:** khi ngân sách quá thấp hoặc ràng buộc mâu thuẫn, server trả lý do có cấu trúc và `infeasibleNotice` đổi thành lời gợi ý cụ thể (tăng ngân sách tới mức nào, bỏ ràng buộc nào). Phản hồi có header `X-Cache: HIT` được nhận biết (`isCacheHit`) để hiển thị nhãn kết quả lấy từ bộ nhớ đệm.
