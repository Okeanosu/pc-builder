---
id: API-ADMIN-WEIGHTS
type: api
title: "API quản trị trọng số thuật toán"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-ADMIN-WEIGHTS"]
  dependsOn: ["M-ADMIN"]
code: ["apps/api/src/modules/admin/weights/**"]
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET/PUT /api/admin/weights`

Đọc và ghi ma trận trọng số/phân bổ theo mục đích và `commercialBoost`; ghi xong xóa cache gợi ý.
