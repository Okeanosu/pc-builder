---
id: M-COMPATIBILITY
type: module
title: "Module compatibility: API kiểm tra tương thích"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-ENGINE", "M-CATALOG"]
  decidedBy: ["ADR-002"]
code: ["apps/api/src/modules/compatibility/**"]
tests: ["apps/api/src/modules/compatibility/**/*.test.ts"]
diagrams: []
---

`loadParts` nạp sản phẩm theo id thành bản đồ một linh kiện mỗi danh mục (id trùng được bỏ qua; id không tồn tại → 404 kèm danh sách `missing`; hai sản phẩm cùng danh mục → 422 `DUPLICATE_CATEGORY`), đổi sang `EngineProduct` và gọi `checkCompatibility` của Engine. Kết quả là `CompatibilityResultDTO` với `ok` = không có lỗi mức `error`. Khi có `purpose`/`budget`, luật cân bằng CPU–GPU (C13, cần catalog tham chiếu từ M-CATALOG) và luật ngân sách (C14) cũng được chạy. Module xuất `loadParts`, `referenceCatalog`, `toCompatibilityResult` để M-BUILDS dùng lại.
