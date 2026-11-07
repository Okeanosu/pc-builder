---
id: M-AUTH
type: module
title: "Module auth: đăng ký, đăng nhập, refresh, đăng xuất"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["M-API-CORE", "E-USER"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/auth/**"]
tests: ["apps/api/src/modules/auth/**/*.test.ts"]
diagrams: []
---

Chứa route, controller, service, repository của xác thực. Băm mật khẩu bằng bcrypt, ký JWT, lưu và thu hồi refresh token trong Redis. Phụ thuộc middleware của M-API-CORE.
