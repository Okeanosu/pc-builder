---
id: M-AUTH
type: module
title: "Module auth: đăng ký, đăng nhập, refresh, đăng xuất"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-API-CORE", "E-USER"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/auth/**"]
tests: ["apps/api/src/modules/auth/**/*.test.ts"]
diagrams: []
---

Gồm `auth.service.ts` (đăng ký, đăng nhập, refresh, đăng xuất, `me`), `auth.tokens.ts` (ký/kiểm refresh token, đặt/xóa cookie) và router trong `index.ts`. Mật khẩu băm bằng bcryptjs (cost 10); email được chuẩn hóa chữ thường. Đăng ký và đăng nhập trả `{ accessToken, user }` và đặt hai cookie httpOnly: `access_token` (15 phút, path `/`) và `refresh_token` (7 ngày, path `/api/auth`), cả hai `SameSite=Lax`, `Secure` khi chạy production.

Refresh token là JWT có `jti`; `jti` được ghi vào Redis tại `rt:{userId}:{jti}` (TTL 7 ngày). Mỗi lần refresh, khóa cũ bị xóa nguyên tử (`DEL` trả về 1 mới hợp lệ) rồi cấp cặp token mới, nên token cũ dùng lại sẽ bị 401 `INVALID_REFRESH_TOKEN`; đăng xuất xóa khóa và xóa cookie. Sai email hay sai mật khẩu đều trả cùng một lỗi 401 `INVALID_CREDENTIALS` (khi email không tồn tại vẫn so bcrypt với một hash giả để thời gian phản hồi tương đương). Đăng nhập bị giới hạn 5 lần/phút/IP bằng express-rate-limit (bộ nhớ trong), tắt trong môi trường test trừ khi test bật `loginRateLimit`. Middleware `optionalAuth`/`requireAuth`/`requireRole` nằm ở M-API-CORE.
