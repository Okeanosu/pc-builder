---
id: ALG-CSP
type: algorithm
title: "Mô hình CSP và Backtracking với thứ tự biến MRV"
status: planned
chapters: ["CH4", "CH5"]
links:
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-AC3", "ALG-FC", "ALG-BNB"]
  decidedBy: ["ADR-004"]
code: ["packages/engine/src/solver/**"]
tests: ["packages/engine/src/solver/**/*.test.ts"]
diagrams: []
---

**Mô hình hóa (phiếu giao nhiệm vụ, nội dung 3):** bài toán chọn linh kiện được phát biểu là một CSP.
- **Biến:** CPU, MAINBOARD, RAM, GPU, STORAGE, PSU, CASE, COOLER (GPU tùy chọn nếu CPU có đồ họa tích hợp và mục đích là văn phòng).
- **Miền:** các sản phẩm còn hàng của danh mục, sau khi lọc theo tùy chọn người dùng và loại bỏ các giá trị bị trội (dominance pruning).
- **Ràng buộc:** các luật C01-C14 (xem các node R-C01..R-C14); ràng buộc nhị phân giữa hai biến dùng cho AC-3 và forward checking, ràng buộc toàn cục (tổng công suất, tổng giá) kiểm tra khi gán đủ biến hoặc dùng làm cận.

**Thuật toán:** backtracking gán lần lượt từng biến. Thứ tự biến theo heuristic MRV (miền nhỏ nhất trước), mặc định `CPU → MAINBOARD → RAM → COOLER → GPU → CASE → PSU → STORAGE`. Sau mỗi phép gán chạy Forward Checking (ALG-FC); miền rỗng thì quay lui. Tiền xử lý bằng AC-3 (ALG-AC3) và cắt nhánh bằng Branch and Bound (ALG-BNB).

**Vì sao cần:** không gian tìm kiếm tích các miền (hàng chục đến hàng trăm giá trị cho 8 biến) quá lớn để duyệt vét cạn; số liệu bench so sánh vét cạn giới hạn và các biến thể cắt tỉa được trình bày ở chương 4.
