---
id: T-ENGINE-SOLVER
type: test
title: "Unit test bộ giải CSP: AC-3, forward checking, Branch and Bound, top-K"
status: planned
chapters: ["CH4"]
links:
  verifies: ["F-ENGINE-CORE", "FR-08", "NFR-08", "ALG-CSP", "ALG-AC3", "ALG-FC", "ALG-BNB", "ALG-TOPK"]
code: []
tests: ["packages/engine/src/solver/**/*.test.ts"]
diagrams: []
---

**Phạm vi:** kết quả luôn tương thích 100% và không vượt ngân sách; AC-3 loại đúng giá trị không có hỗ trợ; FC quay lui khi miền rỗng; B&B không cắt mất lời giải tối ưu (so sánh với vét cạn trên catalog nhỏ); top-K cho 3 nhãn khác nhau; ngân sách quá thấp trả `BUDGET_TOO_LOW` kèm `minFeasibleBudget`; linh kiện cố định xung đột trả `FIXED_PART_CONFLICT`.
