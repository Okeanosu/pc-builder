---
id: F-INVENTORY-LOCK
type: feature
title: "Chống bán vượt: cập nhật có điều kiện trong transaction và giữ hàng 15 phút"
status: planned
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-18", "UC-09"]
  dependsOn: ["M-ORDERS", "E-PRODUCT", "E-INVENTORY-MOVEMENT"]
  decidedBy: ["ADR-007"]
code: ["apps/api/src/modules/orders/**"]
tests: ["apps/api/src/modules/orders/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** hai khách cùng đặt chiếc cuối cùng thì chỉ một người đặt được, không âm kho.

**Mô tả:** khi tạo đơn, trong một transaction chạy `UPDATE products SET reserved = reserved + q WHERE id = $1 AND stock - reserved >= q` cho từng dòng; nếu một dòng không cập nhật được dòng nào thì rollback toàn bộ và báo hết hàng. Sau khi thanh toán: `stock -= q, reserved -= q` và ghi `inventory_movements`. Hủy hoặc quá hạn: `reserved -= q`. Khóa Redis `hold:order:{code}` TTL 15 phút và sweeper 60 giây quét đơn PENDING_PAYMENT quá `expires_at`.

**Quyết định chính:** ADR-007 - điều kiện nằm trong câu UPDATE nên atomic ở tầng cơ sở dữ liệu, không cần khóa phân tán; Redis chỉ làm đồng hồ giữ hàng.

**Điểm nhấn cho báo cáo (CH5):** thí nghiệm đặt hàng đồng thời (N yêu cầu song song cho M sản phẩm trong kho) chứng minh không bán vượt.
