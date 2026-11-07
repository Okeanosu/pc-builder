---
id: F-ADMIN-WEIGHTS
type: feature
title: "Quản trị ma trận trọng số và hệ số ưu tiên thương mại"
status: planned
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-14", "UC-14"]
  dependsOn: ["M-ADMIN", "E-PURPOSE-WEIGHT", "ALG-MCKP", "ALG-SCORING", "F-AUTH"]
  shownIn: ["SCR-ADMIN-WEIGHTS"]
code: ["apps/api/src/modules/admin/weights/**", "apps/web/src/features/admin/weights/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts", "e2e/admin-weights.spec.ts"]
diagrams: []
---

**Mục đích:** cho phép hiệu chỉnh hành vi thuật toán theo phản hồi thực tế (nội dung 6 của phiếu) mà không phải sửa code.

**Mô tả:** `WeightMatrixEditor` hiển thị ma trận 4 mục đích x 8 danh mục gồm trọng số `w` và khoảng phân bổ ngân sách (min-max %), lưu vào bảng `purpose_weights` (`updated_by` ghi người sửa). `commercialBoost` của sản phẩm cộng thêm vào giá trị MCKP để đẩy hàng tồn hoặc hàng khuyến mại. Lưu xong xóa cache gợi ý để lần sau dùng trọng số mới.
