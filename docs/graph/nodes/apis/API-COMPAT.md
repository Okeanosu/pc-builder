---
id: API-COMPAT
type: api
title: "API kiểm tra tương thích"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-COMPAT-CHECK"]
  dependsOn: ["M-COMPATIBILITY"]
code: ["apps/api/src/modules/compatibility/**"]
tests: ["apps/api/src/modules/compatibility/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/compatibility/check`

Nhận `{ productIds[] (1-16), purpose?, budget? }` và trả `CompatibilityResultDTO`: `ok` (không có lỗi mức `error`), danh sách `issues` (mã luật, mức độ, thông điệp tiếng Việt, danh mục liên quan), `estimatedWattage`, `recommendedPsuWattage`. `purpose = gaming` bật cảnh báo cân bằng CPU–GPU, `budget` bật luật ngân sách. Lỗi: 404 `NOT_FOUND` với `details.missing` là các id không tồn tại hoặc sản phẩm đang ẩn (không ACTIVE), 422 `DUPLICATE_CATEGORY` khi chọn hai sản phẩm cùng danh mục, 422 `VALIDATION_ERROR`.
