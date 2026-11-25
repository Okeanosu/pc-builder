---
id: SCR-BUILDER
type: screen
title: "PC Customizer"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/*/builder/**", "apps/web/src/features/builder/**", "apps/web/src/stores/builder.ts"]
tests: ["apps/web/src/features/builder/**/*.test.ts", "apps/web/src/stores/builder.test.ts"]
diagrams: []
---

**Route:** `/builder` (CSR, Workshop). Ảnh chụp 375/1440: `docs/design/screenshots/builder/`.

**Bố cục:** 8 `BuildSlot` kiểu chữ in lụa trên mainboard (`CPU1`, `MB1`, `DIMM_A1`, `PCIE_X16`, `M2_1`, `ATX_PWR`, `CHASSIS`, `CPU_FAN`); slot trống là khung nét đứt "Chọn {danh mục}", slot đã chọn là `ProductCard` dạng danh sách với nút Đổi / Bỏ. Slot dính lỗi được tô viền đỏ (cảnh báo: vàng) và liệt kê mã luật + thông điệp ngay bên dưới. Cột phải (máy tính) là "Tổng quan" dính: CompatibilityBadge, tổng giá, % ngân sách, công suất ước tính so với nguồn (thanh tải), AllocationBar, danh sách vấn đề và các nút. Điện thoại: `BuildSummaryBar` dính đáy (tổng giá, công suất, badge, Thêm vào giỏ).

**PartPicker:** Drawer (bottom sheet trên điện thoại) với ô tìm, sắp xếp, tối đa 3 bộ lọc nhanh lấy từ facets của danh mục, "Ẩn linh kiện không tương thích", danh sách hàng còn trong kho, 12 món mỗi trang. Mỗi món được xem trước tương thích: thay vào slot tương ứng rồi chạy `checkCompatibility` của `@pc/engine` ngay trên trình duyệt, chỉ giữ lỗi liên quan tới danh mục đang chọn; món xung đột bị làm mờ kèm lý do (ví dụ "C01 Socket CPU (AM4) không khớp mainboard (AM5)"), vượt ngân sách chỉ báo nhẹ. Vì danh sách `GET /products` không kèm đủ thông số, trang tải `GET /products/:id` cho từng món đang hiện (TanStack Query, cache 5 phút).

**Trạng thái và hành động:** `useBuilderStore` lưu slot (ProductDTO đầy đủ), mục đích, ngân sách vào `localStorage` `pcb.builder` (try/catch, hydrate sau khi mount); `loadBuild` nạp `GET /builds/:id`, `add` nạp một sản phẩm; trang đọc `?build=` và `?add=` một lần rồi xóa khỏi URL. "Lưu & chia sẻ" gọi `POST /builds` (422 INCOMPATIBLE → toast liệt kê mã luật) rồi mở `/builds/<id>`; cấu hình chưa đổi so với lần lưu/nạp thì dùng lại id, không tạo bản trùng. "Thêm vào giỏ" lưu rồi `POST /cart/builds/:id`; "Hỏi AI tối ưu" mở `/advisor?q=` với câu mô tả cấu hình; "Báo giá PDF" lưu rồi mở `/quotes/builds/:id.pdf`.
