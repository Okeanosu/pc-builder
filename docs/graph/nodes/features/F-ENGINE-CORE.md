---
id: F-ENGINE-CORE
type: feature
title: "Optimization Engine: bộ giải CSP + MCKP thuần TypeScript"
status: done
chapters: ["CH1", "CH4", "CH5"]
links:
  realizes: ["FR-08", "FR-09", "NFR-01", "NFR-08"]
  dependsOn: ["M-ENGINE", "ALG-CSP", "ALG-AC3", "ALG-FC", "ALG-BNB", "ALG-MCKP", "ALG-SCORING", "ALG-TOPK", "F-COMPAT-CHECK"]
  decidedBy: ["ADR-001", "ADR-004", "ADR-012", "ADR-013", "ADR-014", "ADR-020"]
code: ["packages/engine/src/**"]
tests: ["packages/engine/src/**/*.test.ts", "packages/engine/bench/**"]
diagrams: ["docs/diagrams/class-engine.mmd"]
---

**Mục đích:** là lõi học thuật của đề tài: biến bài toán "chọn linh kiện tương thích và tối ưu hiệu năng trong ngân sách" thành bài toán CSP kết hợp MCKP và giải bằng tìm kiếm có cắt tỉa, kèm chứng minh thực nghiệm rằng kết quả là tối ưu.

**Mô tả:** Engine là package thuần (không I/O, không phụ thuộc DB) nhận danh sách ứng viên còn hàng và yêu cầu (ngân sách, mục đích, sở thích, linh kiện cố định, linh kiện loại trừ, `topK`, chiến lược) rồi trả về tối đa 3 cấu hình có nhãn Hiệu năng / Cân bằng / Tiết kiệm (ADR-020), kèm điểm theo danh mục, tỉ lệ phân bổ ngân sách, công suất ước tính, cảnh báo và thống kê (số nút duyệt, số giá trị bị loại bởi dominance, AC-3, forward checking, cận; cờ `capped`; thời gian). Khi vô nghiệm trả lý do (`BUDGET_TOO_LOW` kèm ngân sách tối thiểu, `FIXED_PART_CONFLICT`, `NO_COMPATIBLE_COMBINATION`, `SEARCH_LIMIT`). Cùng bộ luật C01-C15 chạy ở server (nguồn chân lý), trong Engine và ở client (Customizer).

**Cấu trúc (phẳng, một file mỗi mối quan tâm):** `rules.ts` (15 hàm luật thuần và hàm công suất), `compatibility.ts` (`checkCompatibility`), `scoring.ts` và `profiles.ts` (ALG-SCORING), `domains.ts` (mô hình bài toán, dominance), `ac3.ts`, `search.ts` (quay lui, forward checking, B&B), `topk.ts` (hợp đồng nhãn), `bruteforce.ts`, `solver.ts` (`solve`, `solveWithOptions` cho bench), `index.ts` (API công khai). Sơ đồ ở `class-engine.mmd`.

**Quyết định chính:** ADR-001 tách thành package riêng để test độc lập và dùng chung web/api; ADR-004 Engine quyết định linh kiện, LLM chỉ điều phối. Các quyết định rút ra trong quá trình phát triển: chấm theo mức đủ dùng (ADR-012), hệ số CUDA (ADR-013), luật mềm C15 (ADR-014), hợp đồng nhãn và thứ tự biến theo mục tiêu (ADR-020).

**Số liệu cho báo cáo (nguồn: báo cáo task 3 §3 và §5, `bench/results.md`; Apple M3, Node 22, hạt giống 7):**
- **175 test, phủ nhánh 98,85%** (691/699), phủ câu lệnh 99,51%, hàm 99,44%, dòng 99,63%. NFR-08 yêu cầu tối thiểu 90%.
- **Hiệu năng `full`:** p95 **11,5 ms** ở catalog 250 sản phẩm (221 còn hàng) và **40,3 ms** ở 500 sản phẩm (NFR-01: 300 ms). Mean nút duyệt 8.937 và 16.775.
- **So sánh 4 chiến lược** (kịch bản văn phòng 20 triệu, game 25 triệu, đồ họa 40 triệu, AI 60 triệu; 25 lần chạy cho `full`, 3 lần cho mỗi chiến lược vét cạn; trần 2.000.000 nút): ở 250 và 500 sản phẩm brute force, backtracking và forward checking đều chạm trần và không lần nào tìm được cấu hình có điểm bằng `full` (0/12). Cột "tối ưu" của bench lấy chính `full` làm mốc, nên dòng `full` không tự chứng minh được tính tối ưu; bằng chứng là phép kiểm tra tương đương bên dưới. Ở 50 sản phẩm cả bốn đều giải được (p95: brute force 57,1 ms, BT 5,9 ms, FC 9,9 ms, full 1,2 ms).
- **Kiểm tra tương đương (bằng chứng tối ưu):** `pnpm --filter @pc/engine bench:equivalence` so `full` với forward checking vét cạn (không giới hạn nút) trên catalog ngẫu nhiên đủ nhỏ để vét cạn chạy hết. Chạy lại ngày 2026-11-08: 1.080 ca (48 sản phẩm, 30 hạt giống) + 432 ca (72 sản phẩm, 12 hạt giống) = **1.512 ca, 0 sai khác**, 0 vi phạm hợp đồng nhãn (lần chạy ở task 3: 1.502 ca, 0 sai khác).
- **Seed thật** (240 sản phẩm, 213 còn hàng): mọi cấu hình đều tương thích, mỗi lần giải 2-14 ms.
- **Trung thực về AC-3:** AC-3 loại **gần như 0** giá trị trên dữ liệu tổng hợp (2 ở 50 sản phẩm, 0 ở 100 trở lên); mức tăng tốc đến từ cận LP của MCKP cùng thứ tự biến theo mục tiêu, không phải AC-3 (ADR-020). Ablation MRV: p95 1.896 ms so với 11,8 ms ở 250 sản phẩm.
- Không gian tìm kiếm của vét cạn: 1,69e8 (100 sản phẩm), 3,16e11 (250), 8,09e13 (500) tổ hợp.

**Hạn chế đã biết (cần nêu trong báo cáo):** dữ liệu benchmark và thông số của seed là giá trị tham chiếu gần đúng; `tdpW` của CPU là TDP cơ sở nên luật C08 cỡ nguồn theo công suất cơ sở + 30% dự phòng, hơi lạc quan với CPU có công suất đỉnh (PL2) cao như Intel thế hệ 12-14 (thêm trường công suất đỉnh là hướng phát triển, xem R-C08); `commercialBoost` nhân thay vì cộng như công thức spec; điểm văn phòng không nhạy giá; cache điểm theo định danh mảng catalog nên không được sửa catalog tại chỗ.
