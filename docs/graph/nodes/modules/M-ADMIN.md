---
id: M-ADMIN
type: module
title: "Module admin: sản phẩm, tồn kho, benchmark, trọng số, đơn hàng, thống kê"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["M-AUTH", "M-CATALOG", "M-ORDERS", "E-PURPOSE-WEIGHT", "E-INVENTORY-MOVEMENT"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/admin/**"]
tests: ["apps/api/src/modules/admin/**/*.test.ts"]
diagrams: []
---

Toàn bộ route dưới `/admin`, yêu cầu vai trò ADMIN hoặc STAFF; kiểm tra `specs` theo `specSchema` trước khi lưu; xóa cache khi dữ liệu Engine thay đổi.
