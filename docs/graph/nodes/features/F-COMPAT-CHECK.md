---
id: F-COMPAT-CHECK
type: feature
title: "Kiểm tra tương thích linh kiện theo bộ luật C01-C15"
status: done
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-09", "UC-05"]
  dependsOn: ["M-COMPATIBILITY", "M-ENGINE", "ALG-CSP"]
  decidedBy: ["ADR-001", "ADR-014"]
code: ["packages/engine/src/rules.ts", "packages/engine/src/compatibility.ts", "apps/api/src/modules/compatibility/**"]
tests: ["packages/engine/src/rules.test.ts", "apps/api/src/modules/compatibility/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** trả lời "bộ linh kiện này có lắp được và chạy ổn không?" bằng danh sách lỗi (cứng) và cảnh báo (mềm).

**Mô tả:** mỗi luật là một hàm thuần có mã (C01-C15), mức độ (error/warning) và thông điệp tiếng Việt, ví dụ socket CPU không khớp mainboard, RAM sai chuẩn, GPU dài hơn case cho phép, nguồn thiếu công suất. Kết quả kèm công suất ước tính và công suất nguồn khuyến nghị. API `POST /compatibility/check` bọc cùng bộ luật cho client không có Engine.

**Quyết định chính:** luật là dữ liệu của miền (có mã) nên có thể xuất hiện trong thông báo và test; luật nhị phân được dùng lại làm ràng buộc cho CSP.
