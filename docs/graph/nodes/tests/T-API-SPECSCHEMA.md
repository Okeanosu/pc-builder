---
id: T-API-SPECSCHEMA
type: test
title: "Unit test validator specSchema và tính giá"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-12", "F-ADMIN-PRODUCTS", "NFR-10"]
code: []
tests: ["apps/api/src/modules/admin/products/spec-validator.test.ts", "apps/api/src/modules/orders/orders.int.test.ts"]
diagrams: []
---

Validator `validateSpecs`: thông số hợp lệ theo cả `specSchema` và schema có kiểu thì qua, khóa lạ bị loại; thiếu trường bắt buộc báo đúng đường dẫn `specs.socket`; sai kiểu số/boolean/giá trị enum/danh sách enum đều bị bắt; ràng buộc chỉ schema có kiểu biết (số nguyên dương) vẫn được áp; trường admin thêm vào `specSchema` được bắt buộc; mỗi đường dẫn chỉ báo một lần. Tính giá: integration test orders kiểm tra tổng đơn RETAIL/BUILD bằng số nguyên VND, phí lắp ráp chỉ cộng cho đơn BUILD, giá lấy từ DB tại thời điểm đặt.
