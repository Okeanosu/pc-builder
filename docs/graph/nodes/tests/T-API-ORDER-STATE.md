---
id: T-API-ORDER-STATE
type: test
title: "Unit test máy trạng thái đơn hàng"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-05", "FR-15", "F-ORDER"]
code: []
tests: ["apps/api/src/modules/orders/orders.state.test.ts"]
diagrams: []
---

Duyệt đủ 36 cặp trạng thái: 6 cạnh hợp lệ không ném lỗi, 30 cặp còn lại ném `AppError 409 INVALID_TRANSITION` kèm `{from, to}`; trạng thái kết thúc không có lối ra; mỗi cạnh ánh xạ đúng hiệu ứng kho (RELEASE / COMMIT / RESTOCK / NONE). Hiệu ứng thực trên DB (nhả giữ hàng, trừ kho khi thanh toán, trả kho khi hủy đơn đã thanh toán), đơn BUILD so với RETAIL được kiểm ở integration test của orders, payments và admin orders.
