---
id: SCR-CATEGORY
type: screen
title: "Danh sách sản phẩm theo danh mục và tìm kiếm"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]shop[)]/c/**", "apps/web/src/app/[(]shop[)]/search/**", "apps/web/src/features/catalog/ProductBrowser.tsx", "apps/web/src/features/catalog/FilterPanel.tsx", "apps/web/src/features/catalog/filters.ts", "apps/web/src/features/catalog/listing-query.ts", "apps/web/src/features/catalog/Pagination.tsx", "apps/web/src/features/catalog/server.ts"]
tests: ["apps/web/src/features/catalog/listing-query.test.ts"]
diagrams: []
---

**Route:** `/c/[category]`, `/search?q=` (SSR trang đầu + lọc phía client)

Bộ lọc sinh động từ `GET /categories/:key/facets` ghép với `specSchema` của danh mục: thuộc tính enum, chuỗi, mảng enum và boolean thành checkbox kèm số lượng; thuộc tính số thành ô khoảng từ–đến (placeholder là giá trị nhỏ/lớn nhất trong facet). Thêm khoảng giá, thương hiệu (đếm từ danh sách sản phẩm vì API chưa có facet hãng), "chỉ hiện hàng còn trong kho", sắp xếp (mới nhất, hiệu năng, giá, tên) và phân trang.

Toàn bộ trạng thái lọc nằm trên URL với đúng tên tham số của backend (`brand`, `minPrice`, `maxPrice`, `inStock`, `specs[key]=v1,v2`, `specsMin[key]`, `specsMax[key]`, `sort`, `page`), nên liên kết chia sẻ được và nút Back hoạt động. Trang đầu render ở server (SEO); mỗi lần đổi bộ lọc dùng History API (`pushState`) để Next đồng bộ `useSearchParams` mà không gọi lại server, React Query tải trang mới và giữ kết quả cũ (làm mờ) trong lúc chờ. Trên di động bộ lọc mở trong Drawer dạng bottom sheet. Hàm ánh xạ URL ↔ bộ lọc là hàm thuần, có unit test.

`/search` dùng cùng thành phần, không có facet thông số nhưng có lọc theo danh mục, giá và tồn kho.
