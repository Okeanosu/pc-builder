---
id: T-ENGINE-SOLVER
type: test
title: "Unit test bộ giải CSP: AC-3, forward checking, Branch and Bound, top-K"
status: done
chapters: ["CH4"]
links:
  verifies: ["F-ENGINE-CORE", "FR-08", "NFR-08", "ALG-CSP", "ALG-AC3", "ALG-FC", "ALG-BNB", "ALG-TOPK"]
code: []
tests: ["packages/engine/src/solve*.test.ts", "packages/engine/src/strategies.test.ts", "packages/engine/src/labels.test.ts", "packages/engine/src/ac3.test.ts", "packages/engine/src/topk.test.ts", "packages/engine/src/domains.test.ts"]
diagrams: []
---

**Phạm vi:** kết quả luôn tương thích 100% và không vượt ngân sách (`solve.test.ts`, 26 ca); AC-3 loại đúng giá trị không có hỗ trợ (`ac3.test.ts`); dựng miền và lọc trội (`domains.test.ts`); FC quay lui khi miền rỗng và B&B không cắt mất lời giải tối ưu, so với vét cạn trên catalog nhỏ (`strategies.test.ts`); top-K cho 3 nhãn khác nhau (`topk.test.ts`, `labels.test.ts`); ngân sách quá thấp trả `BUDGET_TOO_LOW` kèm `minFeasibleBudget`, linh kiện cố định xung đột trả `FIXED_PART_CONFLICT` (`solve.infeasible.test.ts`).

**Kết quả (2026-11-08):** 175/175 ca của gói Engine đạt, độ phủ nhánh 98,85% (`pnpm --filter @pc/engine test -- --coverage`).
