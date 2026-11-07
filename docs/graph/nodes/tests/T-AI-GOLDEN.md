---
id: T-AI-GOLDEN
type: test
title: "Đánh giá chất lượng AI bằng bộ 30 kịch bản (golden set)"
status: planned
chapters: ["CH4"]
links:
  verifies: ["NFR-02", "NFR-05", "FR-07", "F-AI-ADVISOR"]
code: []
tests: ["apps/api/eval/**"]
diagrams: []
---

**Lệnh:** `pnpm --filter @pc/api eval:ai`. Đo tỷ lệ gọi đúng tool, tham số đúng, cấu hình trả về hợp lệ 100%, và độ trễ end-to-end so với ngưỡng 8 giây. **Đưa vào chương 4 và 5.**
