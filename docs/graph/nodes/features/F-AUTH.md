---
id: F-AUTH
type: feature
title: "Xác thực JWT và phân quyền RBAC"
status: done
chapters: ["CH4"]
links:
  realizes: ["FR-03", "UC-02", "NFR-03"]
  dependsOn: ["M-AUTH", "M-API-CORE", "E-USER"]
  decidedBy: ["ADR-006", "ADR-016"]
  shownIn: ["SCR-AUTH", "SCR-ACCOUNT", "SCR-ACCOUNT-PASSWORD"]
code: ["apps/api/src/modules/auth/**", "apps/web/src/features/auth/**", "apps/web/src/features/account/**"]
tests: ["apps/api/src/modules/auth/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** nhận diện người dùng và chặn truy cập trái quyền vào API quản trị.

**Mô tả:** đăng ký/đăng nhập bằng email và mật khẩu (bcrypt, cost 10). Access token JWT sống 15 phút, gửi qua header `Authorization: Bearer` hoặc cookie httpOnly `access_token`; refresh token sống 7 ngày, lưu trong cookie httpOnly `refresh_token` (path `/api/auth`) và đăng ký ở Redis theo khóa `rt:{userId}:{jti}`. Mỗi lần refresh, `jti` cũ bị xóa và cấp `jti` mới (xoay vòng), nên token cũ bị đánh cắp không dùng lại được; đăng xuất xóa khóa nên có hiệu lực ngay. Middleware `optionalAuth` gắn `req.user` nếu có token hợp lệ, `requireAuth` và `requireRole` bảo vệ route. Giới hạn đăng nhập 5 lần/phút/IP và đăng ký 5 lần/phút/IP; sai email hay sai mật khẩu đều trả cùng thông báo để không lộ email nào đã đăng ký.

**Đổi mật khẩu và token hết hạn (rà soát cuối):** `POST /api/auth/password` kiểm tra mật khẩu hiện tại (sai → 400 `INVALID_CURRENT_PASSWORD`), lưu hash mới, thu hồi mọi refresh token của người dùng (`rt:{userId}:*`) rồi cấp phiên mới; thiết bị khác bị đăng xuất khi access token (tối đa 15 phút) hết hạn. Access token `Bearer` hết hạn ngoài `/api/auth/*` nhận 401 `TOKEN_EXPIRED` để web làm mới phiên thay vì lặng lẽ coi người dùng là khách.

**Củng cố sau rà soát (ADR-016):** JWT mang trường `typ` (`access` hoặc `refresh`) nên token sai loại bị từ chối ở cả hai đầu; khi hai tab cùng refresh, tab thua nhận `401 INVALID_REFRESH_TOKEN` nhưng cookie được giữ nguyên để không đăng xuất oan phiên mà tab thắng vừa làm mới; chỉ token thiếu, giả, hết hạn, sai `typ` hoặc người dùng bị xóa mới bị xóa cookie. Phía web refresh theo kiểu single-flight (`apps/web/src/stores/auth.ts`).

**Trạng thái:** API và giao diện web đều xong: đăng ký/đăng nhập (SCR-AUTH), menu tài khoản, trang tài khoản với đơn hàng và cấu hình đã lưu (SCR-ACCOUNT), xóa cache cá nhân khi đăng xuất hoặc khi refresh thất bại.

**Quyết định chính:** ADR-006 - access token ngắn + refresh token thu hồi được thay vì một JWT dài hạn, để đăng xuất có hiệu lực thật.
