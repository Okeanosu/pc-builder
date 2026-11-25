---
id: SCR-BUILD-SHARE
type: screen
title: "Cấu hình chia sẻ"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]shop[)]/builds/**", "apps/web/src/features/account/BuildView.tsx", "apps/web/src/features/cart/BuildActions.tsx"]
tests: []
diagrams: []
---

**Route:** `/builds/[id]` (SSR)

Xem một cấu hình đã lưu qua liên kết: nhãn (Tối ưu hiệu năng / Cân bằng / Tiết kiệm), mục đích, trạng thái tương thích, 8 linh kiện theo ký hiệu khe, tổng giá so với ngân sách, điểm hiệu năng, AllocationBar với số tiền thật theo từng danh mục, công suất ước tính và nguồn khuyến nghị, danh sách cảnh báo kèm mã luật.

Hành động: "Mua cả bộ" (`POST /cart/builds/:id` rồi sang giỏ hàng; bị khóa nếu có linh kiện hết hàng), "Xuất báo giá PDF" (mở `/quotes/builds/:id.pdf`) và "Sao chép liên kết". `generateMetadata` đặt tiêu đề theo tên cấu hình để chia sẻ đẹp.
