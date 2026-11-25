---
id: SCR-ADMIN-WEIGHTS
type: screen
title: "Admin: ma trận trọng số"
status: done
chapters: ["CH4", "CH5"]
code: ["apps/web/src/app/admin/weights/**", "apps/web/src/features/admin/weights/**", "apps/web/src/features/admin/WeightMatrixEditor.tsx"]
tests: ["apps/web/src/features/admin/weights/**/*.test.ts"]
diagrams: []
---

**Route:** `/admin/weights` (CSR)

`WeightMatrixEditor`: lưới 8 danh mục x 4 nhu cầu, mỗi ô là trọng số hai chữ số thập phân kèm thanh màu danh mục. Dòng tổng cuối mỗi cột tính trực tiếp và phải bằng 1,00 ± 0,001; nếu lệch, nút Lưu của cột bị khóa và có gợi ý "Thêm/Bớt …". Mở một dòng để sửa khoảng phân bổ ngân sách tối thiểu – tối đa của danh mục cho từng nhu cầu (báo lỗi khi min > max, có thanh biểu diễn khoảng). Mỗi nhu cầu lưu riêng; "Khôi phục mặc định" nạp `DEFAULT_PROFILES` của `@pc/engine`, "Hoàn tác" quay về bản đang lưu. Lời giải thích trên trang nói rõ trọng số là `w` trong giá trị MCKP, khoảng phân bổ là heuristic của bộ giải CSP và lưu sẽ xóa cache gợi ý. STAFF xem chỉ đọc.

Ảnh: `weights-sum-check-1440.png`, `weights-saved-1440.png`, `weights-staff-readonly-1440.png`.
