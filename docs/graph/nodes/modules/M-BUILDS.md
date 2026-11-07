---
id: M-BUILDS
type: module
title: "Module builds: lưu, lấy và nhân bản cấu hình"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-COMPATIBILITY", "E-BUILD"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/builds/**"]
tests: ["apps/api/src/modules/builds/**/*.test.ts"]
diagrams: []
---

`builds.service.ts` lưu cấu hình từ chat/form (`save`, `saveMany` nhận `Build` của Engine kèm `{ userId?, source, purpose, budget, name? }`) và từ Customizer (`createCustom`: nạp linh kiện, kiểm tra tương thích, từ chối lỗi cứng bằng 422 `INCOMPATIBLE`, tính tổng giá, điểm theo trọng số mục đích, phân bổ % và công suất). `get`/`getMany` lấy theo id, `listByUser` liệt kê cấu hình của người dùng (mới nhất trước).

`builds.mapper.ts` có `toBuildDTO` (dùng lại cho chatbot): các mục linh kiện được nạp lại thông tin sản phẩm hiện tại (giá, tồn kho), còn tổng giá, điểm, cảnh báo là giá trị đã lưu lúc tạo; sản phẩm đã bị xóa thì hiển thị theo ảnh chụp tên/giá đã lưu với tồn kho 0. Nhân bản cấu hình thực hiện bằng cách gửi lại danh sách `productIds` của build qua `POST /builds`.
