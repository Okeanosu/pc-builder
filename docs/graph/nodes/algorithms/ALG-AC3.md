---
id: ALG-AC3
type: algorithm
title: "Nhất quán cung AC-3 (tiền xử lý miền)"
status: done
chapters: ["CH4", "CH5"]
links:
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-CSP"]
code: ["packages/engine/src/ac3.ts"]
tests: ["packages/engine/src/ac3.test.ts"]
diagrams: []
---

**Mục đích:** loại sớm các giá trị của miền không thể nằm trong bất kỳ lời giải nào.

**Mô tả:** trên các ràng buộc nhị phân (C01-C07, C10-C12), AC-3 duyệt hàng đợi các cung (X, Y); với mỗi giá trị của X mà không có giá trị nào của Y hỗ trợ (thỏa ràng buộc) thì xóa khỏi miền X, và đưa lại các cung liên quan vào hàng đợi cho đến khi ổn định. Ví dụ: mọi mainboard socket AM4 bị loại nếu không còn CPU AM4 nào trong miền sau khi lọc hãng Intel.

**Độ phức tạp:** O(e·d³) với e ràng buộc, d kích thước miền lớn nhất. Số giá trị bị loại được ghi vào `stats.prunedByAc3` để báo cáo.
