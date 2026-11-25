---
id: SCR-ADMIN-INVENTORY
type: screen
title: "Admin: tồn kho và benchmark"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/admin/inventory/**", "apps/web/src/app/admin/benchmarks/**", "apps/web/src/features/admin/inventory/**", "apps/web/src/features/admin/benchmarks/**"]
tests: ["apps/web/src/features/admin/inventory/**/*.test.ts"]
diagrams: []
---

**Route:** `/admin/inventory`, `/admin/benchmarks` (CSR)

Tồn kho: phần "Cần nhập thêm" (sản phẩm đang bán còn bán được ≤ 3, ít nhất lên trước) nằm trên bảng toàn bộ tồn kho có tìm kiếm, lọc danh mục và phân trang; số liệu tự làm mới mỗi 15 giây. Mỗi dòng có trong kho, đang giữ, có thể bán và mức tồn. Hộp thoại điều chỉnh: chọn Nhập kho hoặc Điều chỉnh (kiểm kê), số lượng, ghi chú, xem trước tồn kho sau thay đổi và báo trước các trường hợp server sẽ từ chối (bằng 0, nhập âm, thấp hơn số đang giữ). Ngăn kéo lịch sử kho liệt kê từng biến động (nhập, bán ra, hoàn kho, điều chỉnh) kèm mã đơn liên kết và người thực hiện.

Benchmark: bảng sửa trực tiếp điểm CPU đơn nhân/đa nhân hoặc điểm GPU và nguồn số liệu; lưu từng dòng bằng nút hoặc phím Enter, thanh nhỏ dưới mỗi ô cho thấy điểm tương đối trong danh mục.

Ảnh: `inventory-1440.png`, `inventory-adjust-dialog-1440.png`, `inventory-movements-1440.png`, `benchmarks-gpu-editing-1440.png`, `benchmarks-cpu-1440.png`.
