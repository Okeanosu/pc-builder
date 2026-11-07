---
id: ALG-BNB
type: algorithm
title: "Branch and Bound cho mục tiêu tối đa hóa điểm trong ngân sách"
status: done
chapters: ["CH4", "CH5"]
links:
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-CSP", "ALG-MCKP", "ALG-SCORING"]
code: ["packages/engine/src/search.ts"]
tests: ["packages/engine/src/strategies.test.ts", "packages/engine/src/solve.test.ts"]
diagrams: []
---

**Mục đích:** không chỉ tìm cấu hình hợp lệ mà tìm cấu hình có điểm hiệu năng cao nhất trong ngân sách.

**Cận trên điểm:** điểm hiện tại + tổng điểm lớn nhất còn đạt được ở mỗi miền chưa gán; nếu không vượt điểm thấp nhất trong top-K hiện có thì cắt nhánh.
**Cận chi phí:** chi phí hiện tại + tổng giá nhỏ nhất của mỗi miền chưa gán; nếu vượt ngân sách thì cắt nhánh.

Số nhánh bị cắt ghi vào `stats.prunedByBound`. Cùng với AC-3 và FC, đây là biến thể "full" trong bộ benchmark 4 biến thể; mục tiêu thời gian giải dưới 300 ms p95 với khoảng 250 sản phẩm (NFR-01).
