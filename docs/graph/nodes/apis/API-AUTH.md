---
id: API-AUTH
type: api
title: "API xác thực"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-AUTH"]
  dependsOn: ["M-AUTH"]
code: ["apps/api/src/modules/auth/**"]
tests: ["apps/api/src/modules/auth/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/auth/register` → 201 `{ accessToken, user: UserDTO }`
- `POST /api/auth/login` → 200 `{ accessToken, user: UserDTO }` (giới hạn 5 lần/phút/IP)
- `POST /api/auth/refresh` → 200 `{ accessToken, user }`, đọc cookie `refresh_token` và xoay vòng token
- `POST /api/auth/logout` → 204, thu hồi refresh token và xóa cookie
- `GET /api/auth/me` → `UserDTO` (cần access token qua `Authorization: Bearer` hoặc cookie `access_token`)

Đăng ký/đăng nhập/refresh đặt cookie httpOnly `access_token` (15 phút) và `refresh_token` (7 ngày, path `/api/auth`). Lỗi: 401 `INVALID_CREDENTIALS` (dùng chung cho sai email và sai mật khẩu), 401 `INVALID_REFRESH_TOKEN`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN` (sai vai trò), 409 `EMAIL_TAKEN`, 422 `VALIDATION_ERROR`, 429 `TOO_MANY_REQUESTS`.
