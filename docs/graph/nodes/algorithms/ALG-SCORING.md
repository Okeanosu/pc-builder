---
id: ALG-SCORING
type: algorithm
title: "Chuẩn hóa điểm hiệu năng theo danh mục và mục đích"
status: done
chapters: ["CH4", "CH5"]
links:
  decidedBy: ["ADR-012", "ADR-013"]
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["E-BENCHMARK"]
code: ["packages/engine/src/scoring.ts", "packages/engine/src/profiles.ts"]
tests: ["packages/engine/src/scoring.test.ts"]
diagrams: []
---

**Mục đích:** đưa các đại lượng khác nhau (điểm benchmark CPU/GPU, dung lượng, tốc độ) về thang 0-100 trong từng danh mục để cộng được với nhau, đồng thời không thưởng cho phần "thừa" ở các linh kiện chỉ cần đủ dùng.

**Mô tả (theo `scoring.ts`, `profiles.ts`):** `scoreProduct(p, purpose, catalog)` cho điểm 0-100 trong danh mục.
- **Linh kiện hiệu năng (CPU, GPU):** tổ hợp có trọng số các điểm benchmark theo mục đích: chơi game coi trọng đơn nhân + GPU; đồ họa coi trọng đa nhân + VRAM; AI coi trọng VRAM (card 16 GB xếp trên card nhanh hơn nhưng 8 GB). Khi sản phẩm thiếu benchmark dùng ước lượng từ thông số.
- **Linh kiện chấm theo mức đủ dùng (ADR-012):** nguồn = 0,85 + 0,12 × bậc hiệu suất + 0,03 modular, công suất không cho điểm ngoài C08; mainboard = 0,7 + 0,1 cho mỗi tiêu chí khe M.2, khe RAM, RAM tối đa đạt ngưỡng, bỏ qua chipset (lệch phân khúc xử lý ở C15); tản nhiệt = 0,92 + 0,08 × độ dư định mức; case phẳng; tốc độ RAM bão hòa ở DDR5-6000; tốc độ đọc ổ cứng bão hòa ở 5.000 MB/s (game), 3.500 (văn phòng), 7.500 (đồ họa, AI).
- **Hệ số CUDA (ADR-013):** `ecosystemFactor` nhân điểm GPU không phải NVIDIA với 0,55 (AI) hoặc 0,8 (đồ họa), tắt khi người dùng nêu hãng GPU.
- `cpuGpuTier` cho cấp 1-5 theo ngũ phân vị hạng trung bình trong danh mục của catalog tham chiếu (3 nếu không có tham chiếu); dùng cho luật C13 và C15.
- Kết quả được ghi nhớ theo mảng catalog (WeakMap), vì vậy không được sửa catalog tại chỗ.

**Hồ sơ mục đích (`DEFAULT_PROFILES`):** bốn mục đích với ma trận trọng số lấy đúng từ kế hoạch, khoảng phân bổ = trọng số ± 0,08 kẹp trong [0, 1]; `profileForRequest` dịch trọng số theo độ phân giải. Điểm tổng của cấu hình là tổng có trọng số; `scoreBreakdown` ghi điểm từng danh mục (sau hệ số CUDA nên có thể khác `scoreProduct` thuần), `allocation` là tỉ lệ phần trăm giá (0..1).

**Ghi chú cho báo cáo:** điểm văn phòng không nhạy giá (chỉ nhãn ngân sách có tác dụng); hệ số 0,55/0,8 là hệ số kinh nghiệm đo trên seed. Bộ test `scoring.test.ts` kiểm tra thứ hạng, bão hòa, hệ số CUDA, cấp CPU/GPU và hồ sơ.
