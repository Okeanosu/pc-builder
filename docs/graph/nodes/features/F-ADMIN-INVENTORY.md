---
id: F-ADMIN-INVENTORY
type: feature
title: "Quản trị tồn kho và bảng benchmark"
status: in-progress
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

**Mô tả:** `POST /admin/inventory/:productId/adjust` (`{delta, reason: IMPORT|ADJUST, note?}`) đổi tồn kho bằng một câu UPDATE có điều kiện `stock + delta >= reserved`, nên tồn kho không bao giờ thấp hơn số đang giữ cho đơn chờ thanh toán (vi phạm trả `409 STOCK_BELOW_RESERVED`), và luôn ghi một dòng `inventory_movements` (người thực hiện, lý do, ghi chú). `GET /admin/inventory/:productId/movements` trả lịch sử mới nhất trước, gồm cả movement ORDER/CANCEL do đơn hàng sinh ra (tham chiếu mã đơn). Danh sách sản phẩm quản trị có cờ `lowStock` (còn bán được ≤ 3). Bảng benchmark (`GET /admin/benchmarks`, `GET/PUT /admin/benchmarks/:productId`) chỉnh điểm CPU đơn/đa nhân và điểm GPU, có trường nguồn dữ liệu; sửa xong tăng `catalog:version` vì điểm là đầu vào hàm chấm điểm của Engine.

**Trạng thái:** API xong; trang quản trị (web) chưa làm.
