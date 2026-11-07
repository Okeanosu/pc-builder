---
id: E-BUILD
type: entity
title: "Cấu hình PC"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `builds`

Một cấu hình đã lưu: tên, nhãn (performance/balanced/budget), mục đích, ngân sách, danh sách linh kiện (`items` JSONB gồm danh mục, id, tên, giá tại thời điểm lưu), tổng giá, điểm, chi tiết điểm theo danh mục, phân bổ ngân sách, công suất ước tính và khuyến nghị, cảnh báo, nguồn (CHAT/FORM/CUSTOM). `user_id` trống với khách vãng lai.
