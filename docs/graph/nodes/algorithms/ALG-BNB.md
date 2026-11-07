---
id: ALG-BNB
type: algorithm
title: "Branch and Bound cho mục tiêu tối đa hóa điểm trong ngân sách"
status: done
chapters: ["CH4", "CH5"]
links:
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-CSP", "ALG-MCKP", "ALG-SCORING"]
code: ["packages/engine/src/search.ts"]
tests: ["packages/engine/src/strategies.test.ts", "packages/engine/src/solve.test.ts"]
diagrams: []
---

**Mục đích:** không chỉ tìm cấu hình hợp lệ mà tìm cấu hình có điểm cao nhất trong ngân sách, và chứng minh được nó là tối ưu.

**Cận trên (theo `search.ts`):** là nghiệm của **nới lỏng tuyến tính (LP relaxation) của MCKP** trên các danh mục chưa gán. Mỗi danh mục lấy bao lồi phía trên của các điểm (giá, giá trị); sau đó đi tham lam theo hiệu suất giảm dần trong phần ngân sách còn lại. Cận này chặt hơn nhiều so với "cộng điểm lớn nhất của từng miền", và là nguyên nhân chính của mức tăng tốc: tìm cấu hình tốt nhất ở catalog 250 sản phẩm giảm từ 380 nghìn xuống 1,4 nghìn nút khi thay cận cũ bằng cận LP.
- **Mục tiêu tuyến tính** `điểm − λ·giá` có sàn điểm: bước đi tham lam dừng khi hiệu suất rơi xuống λ, kẹp theo sàn và ngân sách. Vẫn là tối ưu LP chính xác vì mục tiêu lõm dọc đường đi tham lam.
- **Giá nhỏ nhất với điểm ≥ T:** cận dưới LP của phần giá cần thêm để đạt T.
- Mọi biến thể đều **trừ sẵn các phạt mềm đã chắc chắn** (C08 thiếu dư công suất, C09, C13, C15). Phạt chỉ trừ nên cận vẫn admissible (không bao giờ cắt nhầm nhánh chứa nghiệm tối ưu). Việc tính phạt mềm vào cận làm gaming 40 triệu giảm từ 187 nghìn xuống 8 nghìn nút.

**Cận chi phí:** giá hiện tại cộng giá nhỏ nhất của mỗi miền chưa gán; vượt ngân sách thì cắt. Số nhánh bị cắt ghi vào `stats.prunedByBound`.

**Dùng cho top-3 có nhãn:** `full` giải mỗi vai trò (Hiệu năng, Tiết kiệm, Cân bằng) bằng một lượt B&B có ràng buộc (ADR-020); tỉ số điểm/giá được giải bằng phương pháp Dinkelbach (tối đa hóa `điểm − λ·giá` rồi cập nhật λ, thường 2 vòng, vòng hai khởi đầu từ nghiệm đã có).

**Số liệu (báo cáo task 3, bench Apple M3, Node 22, hạt giống 7):** biến thể `full` p95 **11,5 ms** ở 250 sản phẩm và **40,3 ms** ở 500 sản phẩm (NFR-01: 300 ms), số nút trung bình 8.937 và 16.775. Tính tối ưu không lấy từ cột "tối ưu" của bench (cột đó dùng chính `full` làm mốc) mà từ kiểm tra tương đương ngẫu nhiên `pnpm --filter @pc/engine bench:equivalence`: `full` so với duyệt vét cạn có forward checking, chạy lại ngày 2026-11-08 trên 1.512 ca (1.080 ca catalog 48 sản phẩm + 432 ca catalog 72 sản phẩm), 0 sai khác, 0 vi phạm hợp đồng nhãn (lần chạy task 3: 1.502 ca, 0 sai khác).
