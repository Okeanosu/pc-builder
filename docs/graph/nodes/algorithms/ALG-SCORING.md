---
id: ALG-SCORING
type: algorithm
title: "Chuẩn hóa điểm hiệu năng theo danh mục và mục đích"
status: done
chapters: ["CH4", "CH5"]
links:
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["E-BENCHMARK"]
code: ["packages/engine/src/scoring.ts", "packages/engine/src/profiles.ts"]
tests: ["packages/engine/src/scoring.test.ts"]
diagrams: []
---

**Mục đích:** đưa các đại lượng khác nhau (điểm benchmark CPU/GPU, dung lượng, tốc độ) về thang 0-100 để cộng được với nhau.

**Mô tả:** CPU dùng điểm đơn nhân/đa nhân, GPU dùng điểm raster, RAM dùng dung lượng × tốc độ, ổ cứng dùng dung lượng và tốc độ đọc; mỗi danh mục chuẩn hóa theo min-max trong tập ứng viên. Mục đích quyết định trọng số con: chơi game coi trọng đơn nhân + GPU; đồ họa coi trọng đa nhân + VRAM; AI coi trọng VRAM + RAM; văn phòng coi trọng giá. Điểm tổng của cấu hình là tổng có trọng số; `scoreBreakdown` ghi điểm từng danh mục. Hệ số `commercialBoost` được cộng với trọng số nhỏ.
