---
id: SCR-CHECKOUT
type: screen
title: "Thanh toán đơn - thông tin giao hàng"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]shop[)]/checkout/**", "apps/web/src/features/checkout/CheckoutView.tsx", "apps/web/src/features/checkout/checkout-form.ts", "apps/web/src/features/checkout/constants.ts"]
tests: ["apps/web/src/features/checkout/checkout.test.ts"]
diagrams: []
---

**Route:** `/checkout`, `/checkout?build=<id>` (CSR)

Form họ tên, số điện thoại, địa chỉ, ghi chú, kiểm tra bằng `checkoutSchema` dùng chung từ `@pc/shared`; lỗi được viết lại thành câu tiếng Việt cụ thể theo từng trường và mã lỗi (ví dụ "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0"), con trỏ nhảy tới ô sai đầu tiên. Người đã đăng nhập được điền sẵn tên và số điện thoại; khách vãng lai vẫn đặt được.

Tóm tắt bên phải: các dòng sẽ đặt (cả giỏ, hoặc chỉ nhóm cấu hình khi đặt lắp ráp), tạm tính, phí lắp ráp, miễn phí vận chuyển, tổng. Gửi `POST /orders`; thành công thì sang `/orders/{code}/pay`, lỗi hết hàng hiển thị thông điệp từ server và làm mới giỏ.
