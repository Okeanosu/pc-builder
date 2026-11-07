---
id: M-ADMIN
type: module
title: "Module admin: sản phẩm, tồn kho, benchmark, trọng số, đơn hàng, thống kê"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-AUTH", "M-CATALOG", "M-ORDERS", "E-PURPOSE-WEIGHT", "E-INVENTORY-MOVEMENT"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/admin/**"]
tests: ["apps/api/src/modules/admin/**/*.test.ts"]
diagrams: []
---

Toàn bộ route dưới `/admin`, yêu cầu vai trò ADMIN hoặc STAFF; sửa `specSchema` danh mục và ma trận trọng số chỉ ADMIN. Chia thư mục theo chức năng: `products/` (CRUD, ẩn mềm, `spec-validator.ts` kiểm tra `specs` theo cả `specSchema` lẫn schema có kiểu của Engine), `inventory/` (điều chỉnh tồn có nhật ký, lịch sử, benchmark), `weights/`, `orders/` (danh sách, chi tiết, chuyển trạng thái qua máy trạng thái), `stats/` (doanh thu theo kỳ, tổng quan, đối soát thanh toán), `chats/` (nhật ký chat cho màn hình xem lại). Mọi lần ghi ảnh hưởng giá, tồn kho, thông số hay trọng số đều tăng `catalog:version` để cache dữ liệu Engine tự hết hiệu lực. Hợp đồng dữ liệu (schema đầu vào, DTO) nằm ở `packages/shared/src/admin.ts`.
