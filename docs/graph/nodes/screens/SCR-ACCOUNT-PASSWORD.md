---
id: SCR-ACCOUNT-PASSWORD
type: screen
title: "Đổi mật khẩu trong tài khoản"
status: done
chapters: ["CH4"]
code: ["apps/web/src/features/account/ChangePasswordForm.tsx", "apps/web/src/features/account/password-form.ts", "apps/web/src/stores/auth.ts"]
tests: ["apps/web/src/features/account/password-form.test.ts", "apps/web/src/stores/auth.test.ts"]
diagrams: []
---

**Route:** `/account` (CSR), khối "Đổi mật khẩu" dưới phần hồ sơ.

Ba ô: mật khẩu hiện tại, mật khẩu mới (8 đến 72 ký tự) và nhập lại. `validatePasswordChange` kiểm tra phía client; `useAuthStore.changePassword` gọi `POST /auth/password`. Nếu token truy cập vừa hết hạn, store làm mới phiên đúng một lần rồi gửi lại. Server xoay phiên khi đổi mật khẩu nên store nhận token mới (hoặc đọc lại qua refresh khi server trả 204).

**Lỗi:** sai mật khẩu hiện tại hiện ngay ở ô tương ứng; 401 yêu cầu đăng nhập lại; 429 báo thử quá nhiều lần; mất mạng có câu riêng. Thành công thì xóa form và hiện toast "Đã đổi mật khẩu".
