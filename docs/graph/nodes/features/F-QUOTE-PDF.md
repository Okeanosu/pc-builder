---
id: F-QUOTE-PDF
type: feature
title: "Xuất báo giá PDF tiếng Việt"
status: planned
chapters: ["CH4"]
links:
  realizes: ["FR-11", "UC-07"]
  dependsOn: ["M-QUOTES", "E-BUILD"]
  decidedBy: ["ADR-009"]
code: ["apps/api/src/modules/quotes/**"]
tests: ["apps/api/src/modules/quotes/**/*.test.ts"]
diagrams: []
---

**Mục đích:** cho khách mang báo giá đi so sánh hoặc xin duyệt chi.

**Mô tả:** `GET /quotes/builds/:id.pdf` và `GET /quotes/cart.pdf` dựng PDF phía server bằng pdfkit với font DejaVu (ADR-009) để hiển thị đúng dấu tiếng Việt; nội dung gồm bảng linh kiện, đơn giá `vi-VN`, tổng tiền, công suất ước tính, ngày lập báo giá. Giá luôn lấy từ cơ sở dữ liệu tại thời điểm xuất.
