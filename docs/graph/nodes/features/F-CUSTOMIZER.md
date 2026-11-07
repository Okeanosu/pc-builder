---
id: F-CUSTOMIZER
type: feature
title: "Interactive PC Customizer: lắp ráp tự do với kiểm tra tương thích tức thì"
status: done
chapters: ["CH1", "CH4", "CH5"]
links:
  realizes: ["FR-09", "UC-05"]
  dependsOn: ["F-COMPAT-CHECK", "M-WEB-STATE", "M-ENGINE", "F-CATALOG"]
  decidedBy: ["ADR-001"]
  shownIn: ["SCR-BUILDER"]
code: ["apps/web/src/features/builder/**", "apps/web/src/stores/builder.ts", "apps/web/src/app/*/builder/**"]
tests: ["apps/web/src/features/builder/**/*.test.ts", "apps/web/src/stores/builder.test.ts"]
diagrams: ["docs/diagrams/seq-customizer-check.mmd"]
---

**Mục đích:** cho người đã biết mình muốn gì tự lắp từng linh kiện nhưng vẫn được bảo vệ khỏi chọn sai.

**Mô tả:** trang `/builder` có 8 slot linh kiện; chọn linh kiện qua `PartPicker` (drawer có lọc). Mỗi lần đổi, trang chạy bộ luật của `@pc/engine` (`checkCompatibility`) ngay trên trình duyệt để cập nhật huy hiệu tương thích, tổng giá và công suất mà không gọi mạng; ngay trong PartPicker, từng sản phẩm được xem trước tương thích và món xung đột bị làm mờ kèm mã luật. Khi lưu hoặc thêm vào giỏ, server kiểm tra lại trong `POST /builds` (lỗi cứng → 422 INCOMPATIBLE kèm danh sách luật). Luật cân bằng CPU–GPU (C13) cần toàn bộ danh mục để xếp bậc nên chỉ server tính. Nút "Mở trong Customizer" nhận cấu hình từ chatbot hoặc form qua `/builder?build=<id>`.

**Quyết định chính:** chạy cùng một bộ luật ở client và server (ADR-001) - phản hồi tức thì nhưng server vẫn là nguồn chân lý.
