---
id: ALG-FC
type: algorithm
title: "Forward Checking trong lúc gán biến"
status: done
chapters: ["CH4", "CH5"]
links:
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-CSP"]
code: ["packages/engine/src/search.ts"]
tests: ["packages/engine/src/strategies.test.ts", "packages/engine/src/solve.test.ts"]
diagrams: []
---

**Mục đích:** phát hiện sớm nhánh tìm kiếm chắc chắn thất bại.

**Mô tả (theo `search.ts`):** sau khi gán biến X = v, với mỗi biến Y chưa gán có ràng buộc với X, loại khỏi miền Y mọi giá trị mâu thuẫn với v; miền rỗng thì quay lui ngay. Forward checking của Engine kiểm tra bốn thứ: tính tương thích từng cặp (ma trận tính sẵn từ chính các hàm luật), ngân sách còn lại, ràng buộc ba ngôi C08 ngay khi đã gán 2 trong 3 biến (CPU, GPU, PSU), và các cặp (CPU, GPU) bị cấm. Miền được khôi phục khi quay lui. Số giá trị bị loại ghi vào `stats.prunedByForwardChecking`.

**So với backtracking thuần:** backtracking chỉ phát hiện mâu thuẫn khi gán biến vi phạm; FC phát hiện sớm nhiều tầng. Số liệu bench (nút trung bình trên bộ 4 kịch bản văn phòng 20 triệu, game 25 triệu, đồ họa 40 triệu, AI 60 triệu; báo cáo task 3): ở catalog 50 sản phẩm backtracking duyệt 35.315 nút còn FC 29.034 nút; FC là chiến lược thứ ba trong bảng so sánh bốn biến thể (brute force, backtracking, FC, full) và là chuẩn tham chiếu cho kiểm tra tương đương (`bench:equivalence`, xem ALG-CSP).

**Vai trò trong `full`:** FC đóng góp nhiều lượt loại nhất trong biến thể đầy đủ (trung bình 42.068 giá trị mỗi lần giải ở catalog 250 sản phẩm, 124.110 ở 500 sản phẩm), nhưng không một mình quyết định tốc độ: chạy FC mà không có cận LP vẫn chạm trần 2.000.000 nút ở 250 và 500 sản phẩm (0/12 lần tìm được tối ưu).
