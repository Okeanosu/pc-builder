---
id: T-API-SPECSCHEMA
type: test
title: "Unit test validator specSchema và tính giá"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-12", "F-ADMIN-PRODUCTS", "NFR-10"]
code: []
tests: ["apps/api/src/modules/admin/**/*.test.ts"]
diagrams: []
---

Kiểm tra `specs` đúng/sai kiểu theo `specSchema`; tính phí lắp ráp, tổng đơn bằng số nguyên VND.
