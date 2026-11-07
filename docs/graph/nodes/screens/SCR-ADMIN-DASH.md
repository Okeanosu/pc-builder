---
id: SCR-ADMIN-DASH
type: screen
title: "Admin: tổng quan và thống kê"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/admin/layout.tsx", "apps/web/src/app/admin/page.tsx", "apps/web/src/features/admin/dashboard/**", "apps/web/src/features/admin/RevenueChart.tsx", "apps/web/src/features/admin/AdminLayoutClient.tsx", "apps/web/src/features/admin/AdminChrome.tsx"]
tests: ["apps/web/src/features/admin/errors.test.ts"]
diagrams: []
---

**Route:** `/admin` (CSR, giới hạn theo vai trò)

`admin/layout.tsx` bọc mọi trang quản trị trong `AdminShell` (sidebar than chì, menu thành drawer trên điện thoại) và chặn quyền ngay phía client bằng `useAuthStore`: chưa đăng nhập chuyển tới `/login?redirect=…`, tài khoản khách hàng thấy màn hình 403, STAFF và ADMIN vào được (vài trình sửa chỉ ADMIN). Tiêu đề và nút của từng trang được vẽ vào thanh trên cùng bằng portal (`AdminPageHeader`).

Trang tổng quan gồm 4 ô số liệu (doanh thu hôm nay, đơn chờ thanh toán kèm số đơn đã thanh toán cần xử lý, sản phẩm sắp hết hàng, phiên chat AI 7 ngày), biểu đồ cột doanh thu bằng recharts (gộp theo ngày/tuần/tháng; mặc định 30 ngày; trục tiền dạng vi-VN "25 tr", màu `--color-ring` đã kiểm bằng validator dataviz; có bảng số liệu thay thế), bảng đơn hàng mới, số đơn theo từng trạng thái (liên kết sang danh sách đã lọc) và tỉ lệ phiên chạy chế độ dự phòng.

Ảnh: `docs/design/screenshots/admin/dashboard-1440.png`, `dashboard-375.png`, `mobile-menu-375.png`, `forbidden-customer-1440.png`.
