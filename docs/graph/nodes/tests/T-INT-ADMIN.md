---
id: T-INT-ADMIN
type: test
title: "Integration test API quản trị"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-12", "FR-13", "FR-14", "FR-15", "FR-16"]
code: []
tests: ["apps/api/src/modules/admin/**/*.int.test.ts"]
diagrams: []
---

Phân quyền (khách 401, CUSTOMER 403, STAFF được vào; sửa `specSchema` và trọng số chỉ ADMIN). CRUD sản phẩm theo `specSchema` (thiếu trường → 422 kèm đường dẫn, trùng SKU → 409, ẩn mềm), sửa `specSchema` làm trường bắt buộc mới có hiệu lực. Điều chỉnh tồn ghi nhật ký và không cho thấp hơn `reserved`; lịch sử gồm movement từ đơn đã thanh toán; benchmark đọc/ghi. Sửa trọng số: kiểm tra tổng bằng 1 và min ≤ max, tăng `catalog:version` và xóa `cache:reco:*` (vô hiệu cache gợi ý). Chuyển trạng thái đơn theo máy trạng thái, hủy đơn đã thanh toán chỉ ADMIN và trả hàng về kho. Thống kê doanh thu theo ngày/tuần/tháng theo giờ Việt Nam, chỉ tính đơn đã nhận tiền; tổng quan dashboard; đối soát thanh toán; nhật ký chat.
