---
id: E-ORDER-ITEM
type: entity
title: "Dòng đơn hàng"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `order_items`

Ảnh chụp tại thời điểm đặt: `name_snapshot`, `price_snapshot`, số lượng, `build_id` tùy chọn. Giá không đổi khi sản phẩm đổi giá sau đó.
