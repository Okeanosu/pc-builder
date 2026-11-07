---
id: F-BUILD-SHARE
type: feature
title: "Lưu, chia sẻ và nhân bản cấu hình"
status: planned
chapters: ["CH4"]
links:
  realizes: ["FR-10", "UC-06"]
  dependsOn: ["M-BUILDS", "E-BUILD", "F-COMPAT-CHECK"]
  shownIn: ["SCR-BUILD-SHARE"]
code: ["apps/api/src/modules/builds/**", "apps/web/src/features/builds/**"]
tests: ["apps/api/src/modules/builds/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** biến một cấu hình thành thứ có thể lưu, gửi cho bạn bè hoặc kỹ thuật viên và mua lại sau.

**Mô tả:** bảng `builds` lưu danh sách linh kiện (kèm tên và giá tại thời điểm lưu), điểm, phân bổ, công suất ước tính và cảnh báo; `user_id` có thể trống cho khách vãng lai. Trang `/builds/[id]` render SSR, xem được qua liên kết.
