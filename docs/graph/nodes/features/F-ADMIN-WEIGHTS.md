---
id: F-ADMIN-WEIGHTS
type: feature
title: "Quản trị ma trận trọng số và hệ số ưu tiên thương mại"
status: done
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-14", "UC-14"]
  dependsOn: ["M-ADMIN", "E-PURPOSE-WEIGHT", "ALG-MCKP", "ALG-SCORING", "F-AUTH"]
  shownIn: ["SCR-ADMIN-WEIGHTS"]
code: ["apps/api/src/modules/admin/weights/**", "apps/web/src/features/admin/weights/**", "apps/web/src/features/admin/WeightMatrixEditor.tsx"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts", "apps/web/src/features/admin/weights/**/*.test.ts"]
diagrams: []
---

**Mục đích:** cho phép hiệu chỉnh hành vi thuật toán theo phản hồi thực tế (nội dung 6 của phiếu) mà không phải sửa code.

**Mô tả:** `WeightMatrixEditor` hiển thị ma trận 4 mục đích x 8 danh mục gồm trọng số `w` và khoảng phân bổ ngân sách (min-max %), lưu vào bảng `purpose_weights` (`updated_by` ghi người sửa). `GET /admin/weights` cho STAFF/ADMIN xem; `PUT /admin/weights/:purpose` chỉ ADMIN, kiểm tra đủ 8 danh mục, tổng trọng số bằng 1 (sai số ±0,001) và mỗi khoảng phân bổ có min ≤ max (lỗi trả 422 với đường dẫn `weights` hoặc `allocation.{danh mục}`). `commercialBoost` của sản phẩm (sửa qua API sản phẩm, trong khoảng ±0,5) cộng thêm vào giá trị MCKP để đẩy hàng tồn hoặc hàng khuyến mại. Lưu xong tăng `catalog:version` (khóa cache gợi ý chứa phiên bản nên tự hết hiệu lực) và xóa thêm các khóa `cache:reco:*` còn sót.

**Trạng thái:** API và trình sửa ma trận xong (SCR-ADMIN-WEIGHTS): tổng mỗi nhu cầu tính trực tiếp, nút Lưu khóa khi tổng khác 1,00 ± 0,001, khoảng phân bổ sửa trong dòng mở rộng, "Khôi phục mặc định" dùng `DEFAULT_PROFILES` của Engine, STAFF chỉ xem. E2E đổi trọng số rồi so sánh gợi ý (T-E2E-ADMIN-WEIGHTS) vẫn chờ nhóm kiểm thử.
