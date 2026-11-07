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

**Mô tả (theo `ac3.ts`):** AC-3 chạy trên các ràng buộc nhị phân cứng (C01-C07, C10-C12 và phần bộ nhớ của CPU trong C02). Với mỗi cung (X, Y), hàm `revise` loại khỏi miền X mọi giá trị không có giá trị nào của Y hỗ trợ (thỏa ràng buộc); khi miền X đổi thì các cung liên quan được đưa lại vào hàng đợi cho đến khi ổn định. Kết quả trả về `consistent` (có miền rỗng hay không) và `removed` (số giá trị đã loại, ghi vào `stats.prunedByAc3`). Ví dụ: nếu kho chỉ còn mainboard AM5 thì mọi CPU LGA1700 và AM4 bị loại và `removed` đúng bằng chênh lệch kích thước miền (kiểm tra trong `ac3.test.ts`).

**Ràng buộc ba ngôi C08** (nguồn ≥ ⌈(TDP + TGP + 75) × 1,3⌉) không đưa về nhị phân được. Engine dùng nhất quán cận (bounds consistency): vì yêu cầu công suất đơn điệu tăng theo TDP và TGP, một giá trị có hỗ trợ khi nó thỏa với cận thuận lợi nhất của hai miền còn lại.

**Độ phức tạp:** O(e·d³) với e ràng buộc và d là kích thước miền lớn nhất.

**Kết quả đo, nói thẳng (báo cáo task 3, `bench/results.md`):** AC-3 gần như **không loại được gì** trên các catalog tổng hợp dùng để benchmark: trung bình 2 giá trị ở catalog 50 sản phẩm và 0 ở 100, 250, 500 sản phẩm (so với dominance pruning loại 66 giá trị và forward checking loại 42.068 giá trị ở catalog 250). Lý do là catalog sinh ra có nhiều CPU và mainboard cho mỗi socket nên hầu như giá trị nào cũng có hỗ trợ. Vì vậy báo cáo **không ghi công tăng tốc cho AC-3**: mức tăng tốc đến từ cận LP của MCKP kết hợp thứ tự biến theo hàm mục tiêu (ADR-020), còn forward checking và dominance thu nhỏ miền ở mỗi nút. AC-3 vẫn được giữ vì đúng về lý thuyết, rẻ, và phát hiện ngay trường hợp vô nghiệm hiển nhiên (ví dụ kho chỉ còn một socket cho CPU nhưng không có mainboard tương ứng) trước khi tìm kiếm.
