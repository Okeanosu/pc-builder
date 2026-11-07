---
id: F-ADMIN-ORDERS
type: feature
title: "Quản trị đơn hàng"
status: planned
chapters: ["CH4"]
links:
  realizes: ["FR-15", "UC-15"]
  dependsOn: ["M-ADMIN", "F-ORDER", "F-AUTH"]
  shownIn: ["SCR-ADMIN-ORDERS"]
code: ["apps/api/src/modules/admin/orders/**", "apps/web/src/features/admin/orders/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** xử lý đơn từ khi nhận tiền đến khi giao.

**Mô tả:** danh sách đơn có lọc theo trạng thái và loại; chuyển trạng thái qua `PATCH /admin/orders/:code/status`, dùng lại máy trạng thái của F-ORDER nên không thể nhảy bước. Đơn BUILD ở bước PROCESSING được hiểu là đang lắp ráp.
