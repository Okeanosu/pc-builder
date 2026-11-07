---
id: SCR-AUTH
type: screen
title: "Đăng nhập / Đăng ký"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]auth[)]/**", "apps/web/src/features/auth/**"]
tests: ["apps/web/src/features/auth/form-errors.test.ts"]
diagrams: []
---

**Route:** `/login`, `/register` (CSR)

Form đăng nhập và đăng ký kiểm tra bằng `loginSchema` / `registerSchema` của `@pc/shared`, lỗi tiếng Việt theo từng trường; lỗi từ server (sai mật khẩu, email đã dùng, quá số lần thử) hiển thị ở đầu form. Đi qua `useAuthStore` (làm mới token kiểu single-flight); sau khi đăng nhập, giỏ khách được server gộp vào tài khoản và cache giỏ được làm mới.

Tham số `redirect` đưa người dùng về đúng trang trước đó (chỉ chấp nhận đường dẫn cùng site để tránh open redirect); người đã đăng nhập mở `/login` sẽ được chuyển đi ngay. Khi chạy dev có nút điền nhanh ba tài khoản demo. Menu tài khoản ở header cho khách có "Đăng nhập" và "Tạo tài khoản".
