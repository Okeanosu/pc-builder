---
id: SCR-CART
type: screen
title: "Giỏ hàng"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]shop[)]/cart/**", "apps/web/src/features/cart/**"]
tests: ["apps/web/src/features/cart/lines.test.ts"]
diagrams: []
---

**Route:** `/cart` (CSR)

Dữ liệu giỏ lấy qua React Query (`queryKeys.cart`), chỉ gọi sau khi phiên đăng nhập đã xác định để không lẫn giỏ khách với giỏ tài khoản; số lượng trên header đọc cùng cache. Các dòng có `buildId` được gom thành nhóm cấu hình (tên lấy từ `GET /builds/:id`, huy hiệu "Đủ bộ"/"Thiếu linh kiện"), phần còn lại là "Linh kiện mua lẻ". Sửa số lượng, xóa dòng, cảnh báo khi kho còn ít hơn số đang đặt.

Nếu giỏ có đúng một nhóm cấu hình và nhóm đó đủ linh kiện, khối "Đặt lắp ráp nguyên bộ" hiện phí lắp ráp và dẫn tới `/checkout?build=<id>`. "Xuất báo giá PDF" cho giỏ tải file kèm token đăng nhập (liên kết trần không mang được bearer token) rồi mở ở tab mới. Logic gom nhóm và kiểm tra đủ bộ là hàm thuần có unit test.
