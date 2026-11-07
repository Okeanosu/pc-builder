---
id: M-ADMIN
type: module
title: "Module admin: sản phẩm, tồn kho, benchmark, trọng số, đơn hàng, thống kê"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-AUTH", "M-CATALOG", "M-ORDERS", "E-PURPOSE-WEIGHT", "E-INVENTORY-MOVEMENT"]
  decidedBy: ["ADR-002", "ADR-021"]
code: ["apps/api/src/modules/admin/**"]
tests: ["apps/api/src/modules/admin/**/*.test.ts"]
diagrams: []
---

Toàn bộ route dưới `/admin`, yêu cầu vai trò ADMIN hoặc STAFF; sửa `specSchema` danh mục và ma trận trọng số chỉ ADMIN. Chia thư mục theo chức năng: `products/` (CRUD, ẩn mềm, `spec-validator.ts` kiểm tra `specs` theo cả `specSchema` lẫn schema có kiểu của Engine), `inventory/` (điều chỉnh tồn có nhật ký, lịch sử, benchmark), `weights/`, `orders/` (danh sách, chi tiết, chuyển trạng thái qua máy trạng thái), `stats/` (doanh thu theo kỳ, tổng quan, đối soát thanh toán), `chats/` (nhật ký chat cho màn hình xem lại). Mọi lần ghi ảnh hưởng giá, tồn kho, thông số hay trọng số đều tăng `catalog:version` để cache dữ liệu Engine tự hết hiệu lực. Hợp đồng dữ liệu (schema đầu vào, DTO) nằm ở `packages/shared/src/admin.ts`.

**Cổng quản trị phía web (báo cáo task 10):** `apps/web/src/app/admin/**` và `apps/web/src/features/admin/**`. `AdminLayoutClient` bảo vệ theo `useAuthStore` (chưa đăng nhập chuyển tới `/login?redirect=...`, khách hàng thấy trang 403, STAFF và ADMIN vào được; mọi nút chỉ ADMIN được làm đều bị ẩn hoặc khóa kèm lý do với STAFF). Các trang: bảng điều khiển với biểu đồ doanh thu (recharts, ngày/tuần/tháng), sản phẩm với `DynamicSpecForm` và trình sửa lược đồ thông số, tồn kho (hàng cần nhập đứng đầu, tự làm mới 15 giây) và benchmark, ma trận trọng số, đơn hàng với đối soát VietQR và nút chuyển trạng thái chỉ hiện bước hợp lệ (bản sao máy trạng thái của server, có test), nhật ký chat AI. Quản trị có 42 test web riêng ở thời điểm bàn giao; toàn dự án khi tích hợp: API 529, web 166, engine 175 test (số liệu của Lead). Phía server, mọi lần ghi giá, tồn kho, thông số, trạng thái hay trọng số đều gọi `bumpCatalogVersion` để cache hết hiệu lực (ADR-015), và hai thao tác tiền (xác nhận thanh toán tay, hủy đơn đã thanh toán) chỉ ADMIN (ADR-021).
