---
id: F-QUOTE-PDF
type: feature
title: "Xuất báo giá PDF tiếng Việt"
status: done
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

**Mô tả:** `GET /quotes/builds/:id.pdf` và `GET /quotes/cart.pdf` dựng PDF phía server bằng pdfkit với font DejaVu Sans/Sans Bold (ADR-009, nạp từ gói `dejavu-fonts-ttf`) để hiển thị đúng dấu tiếng Việt. Nội dung: tiêu đề "PC BUILDER — BÁO GIÁ CẤU HÌNH", ngày lập (múi giờ Việt Nam), tên cấu hình và nhu cầu, công suất ước tính và nguồn đề xuất, bảng Linh kiện / Sản phẩm / SL / Đơn giá / Thành tiền, tạm tính, phí lắp ráp (báo giá cấu hình), tổng cộng định dạng `vi-VN` + ₫ và ghi chú "Giá tham khảo, có hiệu lực 7 ngày". Giá luôn lấy từ cơ sở dữ liệu tại thời điểm xuất (linh kiện đã ngừng bán dùng giá lưu trong cấu hình). Phản hồi `Content-Type: application/pdf`, `Content-Disposition: inline; filename="bao-gia-{id}.pdf"`.

**Kiểm thử:** integration test giải mã văn bản thật trong PDF (ánh xạ glyph qua bảng ToUnicode của từng font) để khẳng định chuỗi tiếng Việt có dấu được vẽ bằng font DejaVu nhúng.
