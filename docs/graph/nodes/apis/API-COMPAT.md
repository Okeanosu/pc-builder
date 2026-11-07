---
id: API-COMPAT
type: api
title: "API kiểm tra tương thích"
status: planned
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

Nhận `{productIds[]}` (1-16 phần tử) và trả `CompatibilityResultDTO`: `ok`, danh sách `issues` (mã luật, mức độ, thông điệp tiếng Việt, danh mục liên quan), `estimatedWattage`, `recommendedPsuWattage`.
