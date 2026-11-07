---
id: M-QUOTES
type: module
title: "Module quotes: xuất báo giá PDF"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-BUILDS", "M-CART"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/quotes/**"]
tests: ["apps/api/src/modules/quotes/**/*.test.ts"]
diagrams: []
---

`quote-pdf.ts` dựng PDF bằng pdfkit với font DejaVu Sans/Sans Bold cho tiếng Việt (hàm thuần nhận dữ liệu báo giá, trả `Buffer`); `quotes.service.ts` lấy cấu hình từ bảng `builds` hoặc giỏ hiện tại và định giá lại theo DB; `quotes.routes.ts` trả `application/pdf` (`inline`). `test-pdf-text.ts` là tiện ích kiểm thử giải mã văn bản trong PDF qua bảng ToUnicode.
