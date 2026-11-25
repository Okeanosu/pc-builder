---
id: M-SEED
type: module
title: "Dữ liệu mẫu: danh mục, thương hiệu, khoảng 250 sản phẩm, benchmark, trọng số"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-DB"]
code: ["apps/api/src/db/seed/**"]
tests: ["apps/api/src/db/seed/**/*.test.ts"]
diagrams: []
---

Seed khoảng 250 linh kiện đại diện thị trường Việt Nam 2026 (giá tham khảo), điểm benchmark, `specSchema` của 8 danh mục và ma trận trọng số mặc định cho 4 mục đích. Dùng cho demo, benchmark Engine và integration test.
