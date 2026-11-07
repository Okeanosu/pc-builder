---
id: T-ENGINE-BENCH
type: test
title: "Benchmark so sánh 4 biến thể thuật toán"
status: planned
chapters: ["CH4"]
links:
  verifies: ["NFR-01", "ALG-CSP", "ALG-BNB"]
code: []
tests: ["packages/engine/bench/**"]
diagrams: []
---

**Lệnh:** `pnpm --filter @pc/engine bench`. Chạy brute force giới hạn, backtracking, +FC, +AC-3 và B&B trên catalog 50/100/250/500 sản phẩm; xuất bảng CSV/Markdown gồm thời gian, số nút duyệt, số nhánh bị cắt. **Đưa vào chương 4.**
