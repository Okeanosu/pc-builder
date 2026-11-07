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

Mỗi giao dịch của một đơn: nhà cung cấp, số tiền, nội dung chuyển khoản, **`provider_txn_id` duy nhất** (khóa idempotent cho webhook), dữ liệu gốc `raw` (JSONB) và trạng thái.
