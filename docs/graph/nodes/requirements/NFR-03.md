---
id: NFR-03
type: requirement
title: "Bảo mật ứng dụng web và xác thực"
status: planned
chapters: ["CH2"]
code: []
tests: []
diagrams: []
---

Mật khẩu băm bcrypt; JWT access 15 phút và refresh token lưu Redis để thu hồi; cookie httpOnly, SameSite=Lax, Secure ở production; helmet và CORS theo whitelist; giới hạn tần suất đăng nhập (5 lần/phút/IP) và chat (10 tin/phút); mọi đầu vào kiểm tra bằng Zod; truy vấn tham số hóa; không ghi log khóa hay mật khẩu; giá luôn tính lại ở server.
