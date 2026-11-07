---
id: T-AI-GOLDEN
type: test
title: "Đánh giá chất lượng AI bằng bộ 30 kịch bản (golden set)"
status: done
chapters: ["CH4", "CH5"]
links:
  verifies: ["NFR-02", "NFR-05", "FR-07", "F-AI-ADVISOR"]
code: []
tests: ["apps/api/eval/**"]
diagrams: []
---

**Lệnh:** `pnpm --filter @pc/api eval:ai` (thêm `--fallback` để ép chế độ dự phòng, `--only=G01,F02` để chạy một phần). Chạy từng kịch bản trong `eval/golden-set.json` qua `runTurn` với tool và Engine thật trên CSDL dev, dùng Gemini thật khi có `GEMINI_API_KEY`, không thì chế độ dự phòng; ghi `eval/results.md`.

**Bộ kịch bản (30):** gaming 8, đồ họa 5, AI/lập trình 5, văn phòng 4, thiếu thông tin 3 (phải hỏi lại), hội thoại nhiều lượt 3 (rẻ hơn, đổi hãng card, bổ sung ngân sách), hỏi sản phẩm 2. Có khoảng ngân sách, ngân sách viết bằng chữ, tiếng lóng "củ", "2K" là độ phân giải, sở thích hãng/màu/Wi-Fi/kích thước và một ngân sách không khả thi (8 triệu chơi game).

**Chỉ số:** tỷ lệ gọi đúng tool, tham số đúng (mục đích khớp, ngân sách lệch ≤ 5%), sở thích đúng, hiện build đúng lúc, tỷ lệ cấu hình hợp lệ khi kiểm tra lại từng build bằng bộ luật C01–C14 và ngân sách (phải 100%), hỏi lại khi thiếu thông tin, giải thích ngân sách tối thiểu khi vô nghiệm, độ trễ p50/p95 một lượt.

**Kết quả chế độ dự phòng (2026-11-07):** báo cáo hai cột. Nghiêm ngặt (theo kỳ vọng của trợ lý AI): gọi đúng tool 26/30, tham số 23/25, sở thích 9/10, đạt mọi tiêu chí 26/30. Theo `fallbackExpect` (các dòng đánh dấu † trong `results.md`): 30/30. Cấu hình hợp lệ 69/69, p50 10 ms / p95 22 ms. `results.md` có mục "Hạn chế / Limitations": bộ kịch bản được viết khi đã biết phạm vi NLU và không đối kháng, nên điểm dự phòng là cận trên. Kết quả chế độ Gemini sẽ bổ sung khi có khóa API (kiểm tra trước bằng `eval/smoke-gemini.ts`). **Đưa vào chương 4 và 5.**
