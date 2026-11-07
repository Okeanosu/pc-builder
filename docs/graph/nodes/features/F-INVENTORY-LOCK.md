---
id: F-INVENTORY-LOCK
type: feature
title: "Chống bán vượt: cập nhật có điều kiện trong transaction và giữ hàng 15 phút"
status: done
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-18", "UC-09"]
  dependsOn: ["M-ORDERS", "E-PRODUCT", "E-INVENTORY-MOVEMENT"]
  decidedBy: ["ADR-007", "ADR-017"]
code: ["apps/api/src/modules/orders/**", "apps/api/src/jobs/**"]
tests: ["apps/api/src/modules/orders/**/*.int.test.ts", "apps/api/src/jobs/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** hai khách cùng đặt chiếc cuối cùng thì chỉ một người đặt được, không âm kho.

**Mô tả:** khi tạo đơn, trong một transaction chạy `UPDATE products SET reserved = reserved + q WHERE id = $1 AND status = 'ACTIVE' AND stock - reserved >= q` cho từng sản phẩm; nếu một câu không cập nhật được dòng nào thì rollback toàn bộ và trả `409 OUT_OF_STOCK` kèm tên sản phẩm, số yêu cầu và số còn lại. Các dòng được khóa theo thứ tự `product_id` tăng dần (cả khi tạo đơn lẫn khi đổi trạng thái) nên hai đơn chứa cùng sản phẩm theo thứ tự khác nhau không gây deadlock. Sau khi thanh toán: `stock -= q, reserved -= q` và ghi `inventory_movements`. Hủy hoặc quá hạn: `reserved -= q`. Khóa Redis `hold:order:{code}` (TTL = `ORDER_HOLD_MINUTES`) làm đồng hồ giữ hàng; nguồn sự thật là `orders.expires_at`, được job `startOrderExpiryJob` quét mỗi 60 giây (`expirePendingOrders`), mỗi đơn hủy bằng một câu UPDATE có điều kiện trạng thái nên thanh toán đến cùng lúc vẫn thắng.

Bấm đặt hàng trùng của cùng một người mua được chặn riêng (khóa dòng `carts` với tài khoản, khóa Redis `lock:checkout:{gid}` với khách vãng lai), nên không có hai đơn cùng giữ hàng cho một giỏ.

**Quyết định chính:** ADR-007 - điều kiện nằm trong câu UPDATE nên atomic ở tầng cơ sở dữ liệu (READ COMMITTED: giao dịch đến sau chờ khóa dòng rồi đánh giá lại điều kiện trên bản ghi mới), không cần khóa phân tán; Redis chỉ làm đồng hồ giữ hàng.

**Điểm nhấn cho báo cáo (CH5):** `orders.concurrency.int.test.ts` bắn song song thật (5 agent supertest, mỗi agent một giỏ khách riêng, `Promise.all`): sản phẩm tồn 1 → đúng 1 phản hồi 201 và 4 phản hồi `409 OUT_OF_STOCK`, `reserved = 1`; 8 yêu cầu cho 3 sản phẩm → đúng 3 đơn; 6 đơn khóa hai sản phẩm theo thứ tự ngược nhau → không deadlock, không bán vượt. Đối chứng: thay câu UPDATE có điều kiện bằng kiểu "đọc rồi ghi" (SELECT kiểm tra rồi UPDATE không điều kiện) thì cùng bài test cho 5/5 đơn thành công với tồn kho 1, tức bán vượt 4 chiếc.
