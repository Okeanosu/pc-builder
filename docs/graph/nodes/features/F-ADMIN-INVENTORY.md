---
id: F-ADMIN-INVENTORY
type: feature
title: "Quản trị tồn kho và bảng benchmark"
status: planned
chapters: ["CH4"]
links:
  realizes: ["FR-13", "UC-13"]
  dependsOn: ["M-ADMIN", "E-INVENTORY-MOVEMENT", "E-BENCHMARK", "F-AUTH"]
  shownIn: ["SCR-ADMIN-INVENTORY"]
code: ["apps/api/src/modules/admin/inventory/**", "apps/web/src/features/admin/inventory/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** theo dõi hàng trong kho theo thời gian thực và cung cấp dữ liệu hiệu năng cho Engine.

**Mô tả:** `POST /admin/inventory/:productId/adjust` thay đổi tồn kho và luôn ghi một dòng `inventory_movements` (người thực hiện, lý do, tham chiếu); trang tồn kho hiện số tồn, số đang giữ (`reserved`) và lịch sử. Bảng benchmark chỉnh điểm CPU đơn/đa nhân và điểm GPU, có trường nguồn dữ liệu.
