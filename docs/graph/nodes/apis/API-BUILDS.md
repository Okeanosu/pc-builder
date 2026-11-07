---
id: API-BUILDS
type: api
title: "API cấu hình đã lưu"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-BUILD-SHARE"]
  dependsOn: ["M-BUILDS"]
code: ["apps/api/src/modules/builds/**"]
tests: ["apps/api/src/modules/builds/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/builds`
- `GET /api/builds/:id`
- `GET /api/me/builds`

Lưu cấu hình (nguồn CHAT/FORM/CUSTOM), xem theo id (công khai), liệt kê cấu hình của người dùng.
