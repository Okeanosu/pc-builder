---
id: T-INT-AUTH
type: test
title: "Integration test xác thực và phân quyền"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-03", "NFR-03", "F-AUTH"]
code: []
tests: ["apps/api/src/modules/auth/**/*.int.test.ts"]
diagrams: []
---

Đăng ký, đăng nhập, refresh, đăng xuất thu hồi token; khách gọi API admin bị 401, khách hàng bị 403; giới hạn tần suất đăng nhập. Chạy trên Postgres/Redis thật.
