---
id: E-USER
type: entity
title: "Người dùng"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `users`

Tài khoản với email duy nhất, mật khẩu băm, họ tên, số điện thoại tùy chọn và vai trò (`CUSTOMER`, `STAFF`, `ADMIN`, mặc định CUSTOMER). Là gốc của giỏ hàng, đơn, cấu hình, phiên chat.
