---
id: E-BENCHMARK
type: entity
title: "Điểm benchmark"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `benchmarks`

Quan hệ 1-1 với sản phẩm (khóa chính cũng là khóa ngoại, xóa theo sản phẩm): điểm CPU đơn nhân, đa nhân, điểm GPU và nguồn dữ liệu. Đầu vào của hàm chấm điểm.
