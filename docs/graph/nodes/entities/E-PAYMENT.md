---
id: E-PAYMENT
type: entity
title: "Giao dịch thanh toán"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `payments`

Mỗi giao dịch của một đơn (`order_id` để trống với chuyển khoản không khớp đơn nào, trạng thái NO_ORDER, giữ lại để đối soát tay): nhà cung cấp (SEPAY, SIMULATOR, MANUAL), số tiền, nội dung chuyển khoản, **`provider_txn_id` duy nhất** (khóa idempotent cho webhook), dữ liệu gốc `raw` (JSONB) và trạng thái.
