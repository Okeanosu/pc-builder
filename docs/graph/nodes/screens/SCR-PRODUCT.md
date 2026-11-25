---
id: SCR-PRODUCT
type: screen
title: "Chi tiết sản phẩm"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]shop[)]/p/**", "apps/web/src/features/catalog/ProductDetail.tsx", "apps/web/src/features/catalog/BuyBox.tsx", "apps/web/src/features/catalog/ProductGallery.tsx", "apps/web/src/features/catalog/server.ts"]
tests: []
diagrams: []
---

**Route:** `/p/[slug]` (SSR, tối ưu SEO)

Render ở server với `generateMetadata` (title, description, canonical, Open Graph) và JSON-LD `Product`/`Offer` cho máy tìm kiếm. Ảnh sản phẩm hoặc bản vẽ kỹ thuật theo danh mục, PriceTag (giá khuyến mãi + giá gốc gạch + % giảm), các thông số nổi bật, bộ chọn số lượng, "Thêm vào giỏ" và "Thêm vào cấu hình" (`/builder?add=<productId>`).

Dữ liệu sản phẩm được cache vài phút; riêng khối mua hàng tải lại sản phẩm ngay khi mở trang để trạng thái tồn kho ("Còn hàng", "Chỉ còn N", "Tạm hết hàng") luôn đúng. Tab Thông số dùng SpecTable theo `specSchema` của danh mục; tab Hiệu năng vẽ PerfMeter cho điểm benchmark (đơn nhân, đa nhân, đồ họa 3D) quy về thang 100 so với sản phẩm mạnh nhất cùng loại trong cửa hàng; tab Mô tả. Mọi tab đều có trong HTML server để máy tìm kiếm đọc được.

Sản phẩm được lấy trước mọi ranh giới Suspense (`instant = false`) để crawler chỉ đọc HTML (bot xem trước liên kết) nhận đúng mã 404 khi slug không tồn tại. Trình duyệt vẫn nhận 200 kèm `noindex` và giao diện "không còn bán", vì với Partial Prerendering của Next 16 phần khung tĩnh của layout đã được gửi trước khi trang kịp báo 404.
