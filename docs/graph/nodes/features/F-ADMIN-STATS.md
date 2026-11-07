---
id: F-ADMIN-STATS
type: feature
title: "Thống kê doanh thu và đối soát thanh toán"
status: in-progress
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

**Mô tả:** `GET /admin/stats/revenue?from&to&groupBy=day|week|month` cộng `total` của các đơn ở trạng thái PAID, PROCESSING, SHIPPING, COMPLETED theo `paid_at`, gộp bằng `date_trunc` theo giờ Việt Nam (tuần bắt đầu thứ Hai) và lấp kỳ trống bằng `generate_series` để biểu đồ liên tục; mặc định 30 ngày gần nhất. `GET /admin/stats/summary` trả doanh thu và số đơn hôm nay, số đơn theo từng trạng thái, số sản phẩm sắp hết (còn bán được ≤ 3) và số phiên chat 7 ngày qua. `GET /admin/payments` là bảng đối soát: liệt kê giao dịch `payments` (SUCCESS, UNDERPAID, MANUAL_REVIEW) cạnh mã đơn tương ứng.

**Trạng thái:** API xong; dashboard (web) chưa làm.
