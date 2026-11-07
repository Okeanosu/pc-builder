---
id: T-INT-AUTH
type: test
title: "Integration test xác thực và phân quyền"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-03", "NFR-03", "F-AUTH"]
code: []
tests: ["apps/api/src/modules/auth/**/*.int.test.ts"]
diagrams: []
---

Đăng ký → đăng nhập → `me` → refresh → đăng xuất; refresh token cũ dùng lại sau khi xoay vòng và refresh sau khi đăng xuất đều bị 401; `jti` nằm ở Redis `rt:{userId}:{jti}` với TTL 7 ngày; email trùng bị 409; sai email và sai mật khẩu trả cùng một lỗi 401; tài khoản STAFF gọi route chỉ dành cho ADMIN bị 403 còn ADMIN qua được; giới hạn 5 lần đăng nhập/phút/IP (lần thứ 6 bị 429). Chạy trên Postgres/Redis thật.
