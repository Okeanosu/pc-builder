---
id: SCR-ADMIN-PAYMENTS
type: screen
title: "Admin: đối soát giao dịch thanh toán"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/admin/orders/payments/**", "apps/web/src/features/admin/orders/PaymentsPage.tsx", "apps/web/src/features/admin/orders/payments.ts"]
tests: ["apps/web/src/features/admin/orders/payments.test.ts"]
diagrams: []
---

**Route:** `/admin/orders/payments` (CSR), chuyển qua lại với danh sách đơn bằng `OrdersSubNav`.

Bảng mọi giao dịch từ `GET /admin/payments`, phân trang 20 dòng, lọc nhanh bằng các chip: Khớp (SUCCESS), Chuyển thiếu (UNDERPAID), Không khớp đơn (NO_ORDER), Cần đối soát (MANUAL_REVIEW). Mỗi dòng có thời gian, nguồn (SePay, giả lập hoặc thủ công), số tiền, nội dung chuyển khoản, mã đơn liên kết sang `/admin/orders/[code]` (giao dịch không tìm được đơn hiện nhãn rỗng) và huy hiệu trạng thái theo tông màu.

Màn hình giúp quản trị viên tìm tiền nằm ngoài đơn nào (ADR-021) để xử lý tay; việc xác nhận tiền thủ công vẫn thực hiện ở trang chi tiết đơn và chỉ ADMIN được làm.
