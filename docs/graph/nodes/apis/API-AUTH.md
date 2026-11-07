---
id: API-AUTH
type: api
title: "API xác thực"
status: planned
chapters: ["CH4"]
links:
  realizes: ["F-AUTH"]
  dependsOn: ["M-AUTH"]
code: ["apps/api/src/modules/auth/**"]
tests: ["apps/api/src/modules/auth/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Đăng ký và đăng nhập trả access token; refresh token ở cookie httpOnly. `/auth/me` trả `UserDTO`. Lỗi: 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 422 `VALIDATION_ERROR`.
