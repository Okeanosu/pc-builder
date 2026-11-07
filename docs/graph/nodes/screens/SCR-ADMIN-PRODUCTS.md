---
id: SCR-ADMIN-PRODUCTS
type: screen
title: "Admin: sản phẩm"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/admin/products/**", "apps/web/src/features/admin/products/**", "apps/web/src/features/admin/DynamicSpecForm.tsx"]
tests: ["apps/web/src/features/admin/products/**/*.test.ts", "apps/web/src/features/admin/errors.test.ts"]
diagrams: []
---

**Route:** `/admin/products`, `/admin/products/new`, `/admin/products/[id]`, `/admin/products/schema` (CSR)

Danh sách có tìm theo tên/SKU, lọc danh mục và trạng thái (Đang bán/Đã ẩn), cột có thể bán/trong kho/đang giữ, giá (kèm khuyến mãi) và hệ số ưu tiên; bộ lọc nằm trên URL.

Form tạo/sửa: `DynamicSpecForm` sinh ô nhập từ `SpecField[]` của danh mục: số kèm đơn vị, chuỗi, công tắc có/không, chọn một (enum), nhiều ô đánh dấu (enum[]), chip số (number[]); dấu * cho trường bắt buộc. Client chỉ kiểm lỗi đọc số và trường bắt buộc; quy tắc ngữ nghĩa (số nguyên dương, giá trị cho phép) do server quyết định, lỗi `422` được ánh xạ theo đường dẫn `specs.<khóa>` vào đúng ô (thông điệp zod tiếng Anh được dịch). Sửa sản phẩm chỉ gửi các trường đã đổi. Có giá, giá khuyến mãi, tồn kho ban đầu (chỉ khi tạo), mô tả, ảnh, thanh trượt "Hệ số ưu tiên thương mại" 0–0,5 và nút ẩn sản phẩm với bước xác nhận ngay trên trang.

Trình sửa lược đồ thông số (`/admin/products/schema`): thêm, xóa, sắp xếp trường, đổi kiểu/đơn vị/danh sách giá trị, cờ bắt buộc/bộ lọc; khóa mà bộ luật tương thích đọc bị khóa đổi tên/kiểu; xem trước biểu mẫu ngay. Chỉ ADMIN lưu được, STAFF xem chỉ đọc.

Ảnh: `products-1440.png`, `product-edit-1440.png`, `product-spec-422-1440.png`, `product-new-case-1440.png`, `spec-schema-admin-1440.png`, `spec-schema-staff-1440.png`.
