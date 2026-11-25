---
id: T-INT-OVERSELL
type: test
title: "Integration test chống bán vượt (đặt hàng đồng thời)"
status: done
chapters: ["CH4", "CH5"]
links:
  verifies: ["FR-18", "F-INVENTORY-LOCK"]
code: []
tests: ["apps/api/src/modules/orders/orders.concurrency.int.test.ts", "apps/api/src/modules/orders/orders.int.test.ts", "apps/api/src/jobs/order-expiry.int.test.ts", "apps/api/src/modules/payments/payments.webhook.int.test.ts", "apps/api/src/modules/cart/cart.int.test.ts"]
diagrams: []
---

Chạy trên Postgres và Redis thật; mỗi người mua là một agent supertest có cookie `gid` và giỏ khách riêng, các `POST /api/orders` được bắn song song bằng `Promise.all`.

- Tồn kho 1, 5 đơn song song → đúng một `201`, bốn `409 OUT_OF_STOCK` (kèm tên sản phẩm), cuối cùng `reserved = 1`, `stock = 1`.
- N = 8 yêu cầu cho M = 3 sản phẩm → đúng 3 đơn thành công, `stock - reserved = 0`.
- 6 đơn khóa hai sản phẩm theo thứ tự ngược nhau → chỉ có 201/409, không deadlock, mỗi sản phẩm `reserved = 2`.
- Hết hạn giữ hàng: `expirePendingOrders` hủy đơn quá `expires_at`, nhả `reserved`, chạy lại không nhả hai lần; đơn đã thanh toán không bị hủy; một đơn lỗi không chặn các đơn khác; job định kỳ chạy theo chu kỳ và dừng được.
- Bấm đặt hàng trùng song song (khách vãng lai và tài khoản) → đúng một đơn, `reserved` chỉ tăng một lần.
- Webhook trùng gửi song song → một lần PAID, một dòng `payments`; sweeper hết hạn chạy đua với webhook (lặp nhiều vòng) → mỗi đơn hoặc PAID đúng một lần hoặc được nhả đúng một lần, `reserved` cuối cùng bằng 0.
- Thêm vào giỏ song song → không mất số lượng, không vượt tồn khả dụng (Redis và DB).

**Đối chứng (đưa vào chương 5):** khi tạm thay câu UPDATE có điều kiện bằng kiểu "SELECT kiểm tra rồi UPDATE", bài test đầu cho kết quả `[201, 201, 201, 201, 201]` (bán vượt 4 chiếc) và bài N/M cho 8/8 đơn thành công, chứng tỏ bài test phát hiện được race condition và lời giải UPDATE có điều kiện là cần thiết.
