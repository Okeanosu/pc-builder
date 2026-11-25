---
id: F-ADMIN-PRODUCTS
type: feature
title: "Quản trị sản phẩm với form schema động"
status: done
chapters: ["CH4"]
links:
  realizes: ["FR-12", "UC-12"]
  dependsOn: ["M-ADMIN", "E-PRODUCT", "E-CATEGORY", "E-BRAND", "F-AUTH"]
  decidedBy: ["ADR-002"]
  shownIn: ["SCR-ADMIN-PRODUCTS"]
code: ["apps/api/src/modules/admin/products/**", "apps/web/src/features/admin/products/**", "apps/web/src/features/admin/DynamicSpecForm.tsx", "apps/web/src/app/admin/products/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts", "apps/api/src/modules/admin/products/**/*.test.ts", "apps/web/src/features/admin/products/**/*.test.ts", "apps/web/src/features/admin/errors.test.ts"]
diagrams: []
---

**Mục đích:** để chủ cửa hàng tự thêm và sửa linh kiện mà không cần lập trình.

**Mô tả:** form nhập thông số (`DynamicSpecForm`) sinh từ `specSchema` của danh mục. Server kiểm tra `specs` theo **hai lớp**: `spec_schema` (danh sách `SpecField` admin sửa được: bắt buộc, kiểu, tập giá trị) và schema có kiểu `SPEC_SCHEMAS[category]` mà Engine dựa vào (ví dụ số nhân phải là số nguyên dương). Sai ở lớp nào cũng trả `422 VALIDATION_ERROR` với đường dẫn từng trường (`specs.socket`). Khóa không thuộc schema nào bị loại bỏ trước khi lưu. Giá khuyến mãi phải nhỏ hơn giá gốc; SKU/slug trùng trả `409 DUPLICATE`; slug tự sinh bỏ dấu tiếng Việt. Tồn kho chỉ đặt lúc tạo (ghi movement IMPORT), sau đó chỉ đổi qua điều chỉnh tồn kho có nhật ký. Xóa là ẩn mềm (`status = HIDDEN`) vì sản phẩm đã nằm trong đơn và cấu hình. ADMIN sửa `specSchema` qua `PUT /admin/categories/:id/schema`; trường bắt buộc mới áp dụng ngay cho lần ghi sản phẩm sau. Mọi lần ghi tăng `catalog:version` để cache ứng viên/gợi ý tự hết hiệu lực.

**Trạng thái:** API và trang quản trị xong. Web: danh sách sản phẩm, form tạo/sửa với `DynamicSpecForm` (lỗi 422 của server hiện đúng ô `specs.<khóa>`), thanh trượt hệ số ưu tiên thương mại, ẩn mềm có bước xác nhận, trình sửa lược đồ thông số chỉ ADMIN lưu được (SCR-ADMIN-PRODUCTS).
