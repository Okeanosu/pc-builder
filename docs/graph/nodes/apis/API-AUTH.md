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
- `POST /api/auth/register` → 201 `{ accessToken, user: UserDTO }` (giới hạn 5 lần/phút/IP, đếm bằng Redis)
- `POST /api/auth/login` → 200 `{ accessToken, user: UserDTO }` (giới hạn 5 lần/phút/IP)
- `POST /api/auth/refresh` → 200 `{ accessToken, user }`, đọc cookie `refresh_token` và xoay vòng token
- `POST /api/auth/logout` → 204, thu hồi refresh token và xóa cookie
- `POST /api/auth/password` (cần đăng nhập) body `{ currentPassword, newPassword (8..72 ký tự) }` → 200 `{ accessToken, user }` kèm cookie phiên mới như đăng nhập; mọi refresh token `rt:{userId}:*` của người dùng bị thu hồi. Sai mật khẩu hiện tại → 400 `INVALID_CURRENT_PASSWORD`.
- `GET /api/auth/me` → `UserDTO` (cần access token qua `Authorization: Bearer` hoặc cookie `access_token`)

**Access token hết hạn:** token `Bearer` hết hạn gửi tới bất kỳ route nào ngoài `/api/auth/*` nhận `401 { error: { code: 'TOKEN_EXPIRED' } }` thay vì bị coi là khách (trước đây giỏ hàng trả rỗng, đơn hàng trả 404 cho người đã đăng nhập). Client gọi `/auth/refresh` rồi thử lại. Token hết hạn chỉ nằm trong cookie vẫn được coi là khách như cũ, vì trình duyệt tự bỏ cookie hết hạn; token không phải của hệ thống (sai chữ ký, rác) cũng như cũ.

Đăng ký/đăng nhập/refresh đặt cookie httpOnly `access_token` (15 phút) và `refresh_token` (7 ngày, path `/api/auth`). Lỗi: 400 `INVALID_CURRENT_PASSWORD`, 401 `INVALID_CREDENTIALS` (dùng chung cho sai email và sai mật khẩu), 401 `INVALID_REFRESH_TOKEN`, 401 `TOKEN_EXPIRED`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN` (sai vai trò), 409 `EMAIL_TAKEN`, 422 `VALIDATION_ERROR`, 429 `TOO_MANY_REQUESTS` (đăng nhập), 429 `RATE_LIMITED` (đăng ký, kèm `Retry-After`).
