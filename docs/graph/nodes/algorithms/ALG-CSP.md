---
id: ALG-CSP
type: algorithm
title: "Mô hình CSP và tìm kiếm quay lui với thứ tự biến theo hàm mục tiêu"
status: done
chapters: ["CH4", "CH5"]
links:
  decidedBy: ["ADR-004", "ADR-014", "ADR-020"]
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-AC3", "ALG-FC", "ALG-BNB"]
code: ["packages/engine/src/domains.ts", "packages/engine/src/search.ts", "packages/engine/src/solver.ts", "packages/engine/src/bruteforce.ts"]
tests: ["packages/engine/src/solve.test.ts", "packages/engine/src/solve.infeasible.test.ts", "packages/engine/src/strategies.test.ts", "packages/engine/src/domains.test.ts"]
diagrams: []
---

**Mô hình hóa (phiếu giao nhiệm vụ, nội dung 3):** bài toán chọn linh kiện được phát biểu là một CSP.
- **Biến:** 8 biến, mỗi danh mục một biến (CPU, MAINBOARD, RAM, GPU, STORAGE, PSU, CASE, COOLER).
- **Miền:** các sản phẩm còn hàng sau khi lọc theo sở thích cứng và `exclude`, sắp theo id. Linh kiện cố định (`fixed`) ghi đè sở thích và `exclude` nhưng vẫn phải còn hàng. Miền GPU có thêm giá trị "không GPU" khi mục đích là văn phòng và người dùng không bắt buộc GPU rời (khi đó C10 trở thành ràng buộc nhị phân CPU-GPU).
- **Ràng buộc:** các luật cứng C01-C12 (ma trận tương thích từng cặp được tính sẵn từ chính các hàm luật nên bộ giải và Customizer dùng chung một nguồn sự thật; C08 là ba ngôi), luật toàn cục C14 (ngân sách), và bốn luật mềm C08-headroom, C09, C13, C15 tính vào hàm mục tiêu như phạt 2 điểm (CSP có trọng số). Ma trận mô tả đầy đủ ở các node R-C01..R-C15.
- **Mục tiêu:** tổng giá trị MCKP (xem ALG-MCKP) trừ phạt mềm.

**Thuật toán (`search.ts`):** một thủ tục tìm kiếm theo chiều sâu bao trùm cả bốn chiến lược: `bruteforce` (sinh và kiểm tra trên tích Descartes, có trần nút), `backtracking`, `forward-checking` (BT cộng ALG-FC) và `full`. `full` gồm: dominance pruning, AC-3 (ALG-AC3), forward checking (ALG-FC) và Branch and Bound với cận LP của MCKP (ALG-BNB). `solve()` chọn chiến lược, gán nhãn top-3 (ALG-TOPK), chẩn đoán vô nghiệm và dựng `Build`.

**Thứ tự biến (ADR-020).** Mặc định là **thứ tự theo hàm mục tiêu, miền đơn phần tử đi trước**: biến bị ép trước, rồi các danh mục theo trọng số mục đích giảm dần. **MRV (miền nhỏ nhất trước) chỉ giữ làm bản đối chứng.** MRV là heuristic tìm nghiệm khả thi nên rẽ nhánh sớm trên các miền nhỏ giá trị thấp (ổ cứng, nguồn), khiến cận LP siết chậm. Số liệu: ở 250 sản phẩm MRV có p95 1.896 ms (3/12 lần chạm trần nút), thứ tự theo mục tiêu 11,8 ms; ở 500 sản phẩm 2.447 ms so với 41,6 ms.

**Chẩn đoán vô nghiệm:** `BUDGET_TOO_LOW` (kèm `minFeasibleBudget` là tổng giá của cấu hình rẻ nhất tìm được khi bỏ ngân sách, ví dụ 12.820.000 ₫ trên fixture, đúng cả hai phía: có cấu hình ở đúng mức đó và không có ở thấp hơn 1 ₫), `FIXED_PART_CONFLICT` (bỏ linh kiện cố định thì giải được), `NO_COMPATIBLE_COMBINATION`, và `SEARCH_LIMIT` khi chạm trần nút (`nodeLimit`, mặc định 2.000.000, tính chung cả lần chẩn đoán; `stats.capped` báo cờ). Kết quả `SEARCH_LIMIT` không được cache (ADR-015).

**Vì sao cần:** tích các miền (hàng chục đến hàng trăm giá trị cho 8 biến) quá lớn để duyệt vét cạn: 1,69e8 tổ hợp ở catalog 100 sản phẩm, 3,16e11 ở 250 (ước tính 2,1 giờ theo tốc độ đo), 8,09e13 ở 500 (khoảng 25 ngày).

**Số liệu chính (báo cáo task 3 §3, §5; Apple M3, Node 22):**
- 175 test, độ phủ nhánh 98,85% (691/699), phủ câu lệnh 99,51%;
- `full` p95 **11,5 ms** (250 sản phẩm) và **40,3 ms** (500 sản phẩm) so với yêu cầu 300 ms (NFR-01); ba chiến lược còn lại chạm trần 2.000.000 nút ở 250 và 500 sản phẩm;
- kiểm tra tương đương ngẫu nhiên `full` so với forward checking vét cạn: 1.502 ca (1.080 ca catalog 48 sản phẩm + 422 ca catalog 80 sản phẩm), **0 sai khác**, 0 vi phạm hợp đồng nhãn;
- trên seed thật (240 sản phẩm, 213 còn hàng) mỗi lần giải 2-14 ms và mọi cấu hình trả về đều tương thích.
