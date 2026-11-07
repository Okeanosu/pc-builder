---
id: API-BUILDS
type: api
title: "API cấu hình đã lưu"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-BUILD-SHARE"]
  dependsOn: ["M-BUILDS"]
code: ["apps/api/src/modules/builds/**"]
tests: ["apps/api/src/modules/builds/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/builds` → 201 `BuildDTO`
- `GET /api/builds/:id` → `BuildDTO` (công khai, dùng cho liên kết chia sẻ; 404 nếu không có)
- `GET /api/me/builds` → `BuildDTO[]` của người dùng đăng nhập, mới nhất trước (401 nếu chưa đăng nhập)

`POST /builds` nhận `{ name?, purpose, budget?, productIds[] (1-16) }` từ Customizer, kiểm tra tương thích bằng bộ luật C01-C14 và lưu với nguồn CUSTOM (gắn người dùng nếu đã đăng nhập). Lỗi cứng → 422 `INCOMPATIBLE` với `details` là danh sách issue; id không tồn tại hoặc sản phẩm đang ẩn → 404 với `details.missing`; hai sản phẩm cùng danh mục → 422 `DUPLICATE_CATEGORY`. Các mục linh kiện trong `BuildDTO` luôn mang thông tin sản phẩm hiện tại, còn `totalPrice` và `score` là giá trị lưu lúc tạo.
