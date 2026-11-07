---
id: F-BUILD-SHARE
type: feature
title: "Lưu, chia sẻ và nhân bản cấu hình"
status: done
chapters: ["CH4"]
links:
  realizes: ["FR-10", "UC-06"]
  dependsOn: ["M-BUILDS", "E-BUILD", "F-COMPAT-CHECK"]
  shownIn: ["SCR-BUILD-SHARE"]
code: ["apps/api/src/modules/builds/**", "apps/web/src/features/account/BuildView.tsx", "apps/web/src/features/cart/BuildActions.tsx"]
tests: ["apps/api/src/modules/builds/**/*.test.ts"]
diagrams: []
---

**Mục đích:** biến một cấu hình thành thứ có thể lưu, gửi cho bạn bè hoặc kỹ thuật viên và mua lại sau.

**Mô tả:** bảng `builds` lưu danh sách linh kiện (kèm tên và giá tại thời điểm lưu), điểm, phân bổ, công suất ước tính và cảnh báo; `user_id` có thể trống cho khách vãng lai. Cấu hình đến từ chat, form gợi ý hoặc Customizer (`POST /builds`, bị từ chối nếu vi phạm luật cứng). `GET /builds/:id` công khai để chia sẻ qua liên kết; khi xem lại, linh kiện hiển thị giá và tồn kho hiện tại, còn tổng giá và điểm giữ nguyên như lúc lưu. Trang `/builds/[id]` render SSR, xem được qua liên kết.

**Trạng thái:** phần API đã xong (M-BUILDS, API-BUILDS); trang chia sẻ trên web chưa làm.
