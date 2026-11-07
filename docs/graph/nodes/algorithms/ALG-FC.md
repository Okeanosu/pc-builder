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

**Mô tả:** sau khi gán biến X = v, với mỗi biến Y chưa gán có ràng buộc với X, loại khỏi miền Y mọi giá trị mâu thuẫn với v. Nếu miền của Y rỗng thì quay lui ngay mà không cần thử tiếp. Miền được khôi phục khi quay lui (lưu ảnh chụp thay đổi theo từng mức). Số giá trị bị loại ghi vào `stats.prunedByForwardChecking`.

**So với backtracking thuần:** backtracking chỉ phát hiện mâu thuẫn khi gán biến vi phạm; FC phát hiện sớm hơn nhiều tầng nên giảm mạnh số nút duyệt.
