---
id: T-ENGINE-BENCH
type: test
title: "Benchmark so sánh 4 biến thể thuật toán"
status: done
chapters: ["CH4"]
links:
  verifies: ["NFR-01", "ALG-CSP", "ALG-BNB"]
code: []
tests: ["packages/engine/bench/**"]
diagrams: []
---

**Lệnh:** `pnpm --filter @pc/engine bench`. Chạy brute force giới hạn, backtracking, +FC và bản đầy đủ (AC-3 + FC + B&B) trên catalog tổng hợp 50/100/250/500 sản phẩm; xuất `packages/engine/bench/results.md` gồm thời gian p50/p95, số nút duyệt, số nhánh bị cắt theo từng kỹ thuật và tỷ lệ tìm được lời giải tối ưu.

**Kết quả (2026-11-07, Apple M3, Node v22.20.0):** bản đầy đủ p95 = 11,5 ms trên catalog 250 sản phẩm (mục tiêu < 300 ms); ba biến thể kia chạm giới hạn 2.000.000 nút từ catalog 100 sản phẩm trở lên. Cột "tối ưu" lấy chính bản đầy đủ làm mốc nên không tự chứng minh tối ưu; bằng chứng là `bench:equivalence` (chạy lại 2026-11-08: 1.080 + 432 = 1.512 ca, 0 sai khác so với vét cạn có forward checking). Bảng tóm tắt được chép lại (ghi nguồn) trong `docs/testing/test-report.md`. **Đưa vào chương 4.**
