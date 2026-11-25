---
id: F-CATALOG
type: feature
title: "Danh mục sản phẩm, lọc theo thông số JSONB và trang chi tiết"
status: done
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-01", "FR-02", "UC-01"]
  dependsOn: ["M-CATALOG", "E-PRODUCT", "E-CATEGORY", "E-BENCHMARK"]
  decidedBy: ["ADR-002", "ADR-015"]
  shownIn: ["SCR-CATEGORY", "SCR-PRODUCT"]
code: ["apps/api/src/modules/catalog/**", "apps/web/src/features/catalog/**"]
tests: ["apps/api/src/modules/catalog/**/*.test.ts"]
diagrams: []
---

**Mục đích:** cho khách duyệt và lọc hàng trăm linh kiện có thuộc tính kỹ thuật khác nhau mà không cần một bảng cột riêng cho từng loại.

**Mô tả:** mỗi danh mục khai báo `specSchema` (danh sách trường: khóa, nhãn, kiểu, có lọc được hay không). Thông số của sản phẩm nằm trong cột JSONB `products.specs`. API trả facet (các giá trị và số lượng sản phẩm ACTIVE) sinh từ schema để web dựng bộ lọc động. Lọc theo thông số dùng phép chứa JSONB, ví dụ `specs @> '{"socket":"AM5","memoryTypes":["DDR5"]}'`, giá trị được định kiểu theo schema (số, boolean, phần tử mảng), nhiều giá trị của một khóa được OR; khoảng số dùng `specsMin`/`specsMax`. Phép chứa được tăng tốc bằng chỉ mục GIN `jsonb_path_ops`; lọc giá dùng giá thực trả; tìm theo tên dùng ILIKE và GIN trên `to_tsvector`. Danh mục được đổi sang `category_id` trước khi truy vấn để planner thấy đúng phân bố dữ liệu và chọn GIN.

**Trạng thái:** API và giao diện đã xong: trang danh mục với bộ lọc sinh từ facet (SCR-CATEGORY), tìm kiếm, trang chi tiết có bảng thông số và benchmark (SCR-PRODUCT). Danh sách ứng viên của Engine được cache theo phiên bản catalog (`cache:candidates:v{version}`, TTL 300 giây, ADR-015).

**Quyết định chính:** dùng JSONB + GIN thay vì mô hình EAV để truy vấn nhanh và thêm danh mục/thuộc tính mà không đổi schema; dữ liệu JSONB vẫn được kiểm tra bằng Zod theo schema từng danh mục. Trang chi tiết render SSR để tối ưu SEO.

**Điểm nhấn cho báo cáo (CH5):** truy vấn JSONB containment + GIN. Integration test (`catalog.int.test.ts`) chèn 5.000 sản phẩm tổng hợp, chạy `ANALYZE`, rồi `EXPLAIN` đúng câu SQL mà API sinh ra (`category=cpu&specs[socket]=AM5`) với cấu hình planner mặc định và khẳng định kế hoạch dùng chỉ mục `products_specs_gin` (GIN `jsonb_path_ops` trên `specs`); nó chạy ổn định 3/3 lần liên tiếp. **Bằng chứng EXPLAIN đáng nêu:** lần đầu kế hoạch lại là `Bitmap Index Scan on products_category_price_idx`, vì bộ lọc danh mục đi qua phép nối `categories` nên planner ước lượng 655 dòng mỗi danh mục và bỏ qua GIN; sau khi API phân giải `category_id` trước và lọc `products.category_id = $1` (giống câu truy vấn mẫu của spec), kế hoạch chuyển sang `products_specs_gin`. Bài học: chỉ mục JSONB chỉ phát huy khi planner thấy đúng thống kê. Báo cáo chưa có thời gian EXPLAIN ANALYZE có và không có chỉ mục (test chỉ khẳng định dạng kế hoạch); nếu cần số đo thì chạy thêm trên catalog 5.000 dòng. Đo thêm: các biến thể phép chứa, khoảng số (`specsMin`/`specsMax`), phân trang và facet có test riêng (16 test tích hợp catalog).
