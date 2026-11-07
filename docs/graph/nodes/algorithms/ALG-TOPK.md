---
id: ALG-TOPK
type: algorithm
title: "Chọn top-K cấu hình đa dạng và gắn nhãn"
status: done
chapters: ["CH4", "CH5"]
links:
  decidedBy: ["ADR-020"]
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-BNB"]
code: ["packages/engine/src/topk.ts"]
tests: ["packages/engine/src/topk.test.ts", "packages/engine/src/labels.test.ts"]
diagrams: []
---

**Mục đích:** trả cho người dùng 2-3 lựa chọn thật sự khác nhau, mỗi lựa chọn có một vai trò rõ ràng, thay vì ba biến thể gần giống.

**Hợp đồng nhãn (`topk.ts`, ADR-020).** Gọi P là cấu hình điểm cao nhất, T = 0,85 × P.điểm. Mọi cấu hình còn lại có giá ≤ P.giá và dùng cặp (CPU, GPU) chưa cấu hình nào khác dùng.
- **performance** (Hiệu năng) = P; hòa thì giá thấp hơn, rồi theo id sản phẩm.
- **budget** (Tiết kiệm) = cấu hình rẻ nhất có điểm ≥ T. Không có thì bỏ vai trò này.
- **balanced** (Cân bằng) = điểm/giá lớn nhất trong số cấu hình có điểm ≥ (P.điểm + budget.điểm)/2. Không có thì: nếu có budget lấy điểm cao nhất ≥ T với giá ≤ P.giá; nếu không có budget lấy điểm cao nhất với giá ≤ P.giá.
- Vai trò được giữ như đã chọn, không suy lại từ việc sắp theo điểm; thiếu vai trò thì bỏ, nên kết quả có thể có 2 cấu hình.
- Bất biến được test: budget.giá ≤ balanced.giá ≤ performance.giá; budget.điểm ≥ 0,85 × performance.điểm; performance.điểm ≥ mọi điểm khác.
- Cảnh báo C14 "dùng chưa hết ngân sách" chỉ gắn vào `performance`.

**Vì sao không đơn giản là sắp theo điểm:** bản đầu sắp xếp rồi gán nhãn theo thứ hạng nên đổi vai trò: cấu hình "Tiết kiệm" đắt hơn "Cân bằng" ở 6/302 ca thường và 44/1.200 ca có sở thích. Định nghĩa "cân bằng = điểm/giá lớn nhất" cũng suy biến về chính cấu hình rẻ nhất (18,61 triệu so với 18,57 triệu ở cùng điểm); sàn trung điểm và trần giá khắc phục điều đó. Ví dụ bench 250 sản phẩm, gaming 25 triệu: Hiệu năng 24,67 triệu (68,05 điểm), Cân bằng 19,67 triệu (63,15), Tiết kiệm 17,56 triệu (58,05).

**Hai cách chọn.** `full` chạy một lượt B&B có ràng buộc cho mỗi vai trò (tỉ số điểm/giá bằng Dinkelbach). Các chiến lược vét cạn (brute force, BT, FC) đưa mọi cấu hình khả thi vào mặt Pareto theo từng cặp (CPU, GPU) trên (điểm tăng, giá giảm) rồi dùng `selectDiverse` với cùng hợp đồng; mỗi vai trò đều Pareto-tối ưu trong cặp của nó dưới trần giá nên phép chọn là chính xác. Mọi hòa nhau được phá theo thứ tự chuẩn (điểm, giá, id) và điểm lá được cộng theo thứ tự chuẩn nên các chiến lược cho kết quả trùng từng bit; `bench:equivalence` xác nhận trên 1.502 ca, 0 sai khác.
