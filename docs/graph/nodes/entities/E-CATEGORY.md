---
id: E-CATEGORY
type: entity
title: "Danh mục linh kiện"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `categories`

Tám danh mục cố định (`key`: cpu, mainboard, ram, gpu, storage, psu, case, cooler) cùng `slug`, tên, thứ tự và **`spec_schema` (JSONB)**: danh sách `SpecField` mô tả các thuộc tính của danh mục, là cơ sở của form quản trị động và bộ lọc động.
