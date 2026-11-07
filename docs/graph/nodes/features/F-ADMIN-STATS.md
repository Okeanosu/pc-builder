---
id: F-ADMIN-STATS
type: feature
title: "Thống kê doanh thu và đối soát thanh toán"
status: planned
chapters: ["CH4"]
links:
  realizes: ["FR-16", "UC-16"]
  dependsOn: ["M-ADMIN", "E-ORDER", "E-PAYMENT", "F-AUTH"]
  shownIn: ["SCR-ADMIN-DASH"]
code: ["apps/api/src/modules/admin/stats/**", "apps/web/src/features/admin/dashboard/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** cho chủ cửa hàng thấy tình hình kinh doanh.

**Mô tả:** `GET /admin/stats/revenue?from&to&groupBy` gộp doanh thu và số đơn đã thanh toán theo ngày/tuần/tháng bằng SQL `date_trunc`; bảng đối soát liệt kê giao dịch `payments` cạnh đơn tương ứng.
