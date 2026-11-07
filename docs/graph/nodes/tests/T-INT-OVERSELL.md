---
id: T-INT-OVERSELL
type: test
title: "Integration test chống bán vượt (đặt hàng đồng thời)"
status: planned
chapters: ["CH4"]
links:
  verifies: ["FR-18", "F-INVENTORY-LOCK"]
code: []
tests: ["apps/api/src/modules/orders/**/*.int.test.ts"]
diagrams: []
---

N yêu cầu đặt song song cho M < N sản phẩm trong kho: đúng M đơn thành công, kho không âm. Kịch bản hết hạn giữ hàng: `reserved` được nhả. **Đưa vào chương 5.**
