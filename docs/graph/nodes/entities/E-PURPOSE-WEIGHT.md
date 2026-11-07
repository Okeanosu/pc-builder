---
id: E-PURPOSE-WEIGHT
type: entity
title: "Ma trận trọng số theo mục đích"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `purpose_weights`

Mỗi dòng là một mục đích (khóa chính: gaming, graphics, ai, office) với `weights` (trọng số từng danh mục) và `allocation` (khoảng % ngân sách gợi ý min-max từng danh mục), cùng người sửa và thời điểm sửa. Admin chỉnh được.
