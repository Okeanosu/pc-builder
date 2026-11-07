---
id: API-ADMIN-WEIGHTS
type: api
title: "API quản trị trọng số thuật toán"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-WEIGHTS"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/weights/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/admin/weights` (STAFF/ADMIN)
- `PUT /api/admin/weights/:purpose` (chỉ ADMIN, `purposeWeightsSchema`)

Đọc và ghi ma trận trọng số/phân bổ theo mục đích; tổng trọng số phải bằng 1 ± 0,001 và mỗi khoảng phân bổ min ≤ max (422). Ghi xong tăng `catalog:version` và xóa `cache:reco:*` để gợi ý dùng trọng số mới. `commercialBoost` sửa qua API sản phẩm.
