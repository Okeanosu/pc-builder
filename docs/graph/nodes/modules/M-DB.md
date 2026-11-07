---
id: M-DB
type: module
title: "Tầng dữ liệu: Drizzle schema, migration và kết nối PostgreSQL"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-SHARED"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/db/**", "apps/api/drizzle/**", "apps/api/drizzle.config.ts"]
tests: ["apps/api/src/app.test.ts"]
diagrams: ["docs/diagrams/erd.mmd"]
---

**Mục đích:** định nghĩa toàn bộ lược đồ cơ sở dữ liệu bằng TypeScript (Drizzle) để kiểu và SQL luôn khớp nhau.

**Mô tả:** 15 bảng và 9 kiểu enum (role, product_status, order_status, order_type, payment_status, movement_reason, build_source, chat_mode, chat_role). Tiền là `bigint` mode number. Cột JSONB có kiểu TypeScript (`specs`, `spec_schema`, `items`, `weights`...). Chỉ mục đáng chú ý: GIN `jsonb_path_ops` trên `products.specs`, GIN `to_tsvector('simple', name)`, `(category_id, price)`, unique `(cart_id, product_id, build_id)`, `(status, expires_at)` cho sweeper đơn hết hạn. Migration `0000_init.sql` sinh bởi drizzle-kit.

Sơ đồ ERD (`erd.mmd`) được sinh từ đúng file `schema.ts` này.
