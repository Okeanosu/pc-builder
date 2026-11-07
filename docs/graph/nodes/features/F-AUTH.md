---
id: F-AUTH
type: feature
title: "Xác thực JWT và phân quyền RBAC"
status: planned
chapters: ["CH4"]
links:
  realizes: ["FR-03", "UC-02", "NFR-03"]
  dependsOn: ["M-AUTH", "M-API-CORE", "E-USER"]
  decidedBy: ["ADR-006"]
  shownIn: ["SCR-AUTH", "SCR-ACCOUNT"]
code: ["apps/api/src/modules/auth/**", "apps/web/src/features/account/**"]
tests: ["apps/api/src/modules/auth/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** nhận diện người dùng và chặn truy cập trái quyền vào API quản trị.

**Mô tả:** đăng ký/đăng nhập bằng email và mật khẩu (bcrypt). Access token JWT sống 15 phút, gửi qua header `Authorization: Bearer` hoặc cookie; refresh token sống 7 ngày, lưu trong cookie httpOnly và đăng ký ở Redis theo khóa `rt:{userId}:{jti}` để thu hồi được khi đăng xuất. Middleware `optionalAuth` gắn `req.user` nếu có token hợp lệ, `requireAuth` và `requireRole` bảo vệ route. Giới hạn đăng nhập 5 lần/phút/IP.

**Quyết định chính:** ADR-006 - access token ngắn + refresh token thu hồi được thay vì một JWT dài hạn, để đăng xuất có hiệu lực thật.
