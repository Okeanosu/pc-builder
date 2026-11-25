---
id: M-ENGINE
type: module
title: "Package @pc/engine: Optimization Engine thuần TypeScript"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-SHARED", "ALG-CSP", "ALG-MCKP", "ALG-SCORING"]
  decidedBy: ["ADR-001", "ADR-004", "ADR-012", "ADR-013", "ADR-014", "ADR-020"]
code: ["packages/engine/src/**"]
tests: ["packages/engine/src/**/*.test.ts"]
diagrams: []
---

**Mục đích:** nơi chứa luật tương thích, bộ giải CSP, MCKP và hàm chấm điểm; không có I/O nên test nhanh và chạy được trên cả trình duyệt lẫn Node.

**Giao diện công khai (kiểu hiện có trong `types.ts`):** `EngineProduct`, `PartMap`, `RuleCode` (C01-C15), `CompatibilityIssue/Report`, `PurposeProfile`, `SolveRequest` (budget, purpose, preferences, fixed, exclude, topK, strategy), `Build`, `SolveStats`, `SolveResult` (kèm `infeasibleReason` và `minFeasibleBudget`).

**Quyết định:** engine chỉ phụ thuộc @pc/shared; mọi dữ liệu vào ra qua tham số.
