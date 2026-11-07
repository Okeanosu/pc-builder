---
id: E-INVENTORY-MOVEMENT
type: entity
title: "Biến động tồn kho"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `inventory_movements`

Nhật ký bất biến mỗi lần tồn kho đổi: `delta` (âm/dương), lý do (IMPORT, ORDER, CANCEL, ADJUST), tham chiếu (mã đơn...), người thực hiện. Phục vụ truy vết và theo dõi tồn kho thời gian thực.
