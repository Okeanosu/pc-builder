---
id: F-ENGINE-CORE
type: feature
title: "Optimization Engine: bộ giải CSP + MCKP thuần TypeScript"
status: planned
chapters: ["CH1", "CH4", "CH5"]
links:
  realizes: ["FR-08", "FR-09", "NFR-01", "NFR-08"]
  dependsOn: ["M-ENGINE", "ALG-CSP", "ALG-AC3", "ALG-FC", "ALG-BNB", "ALG-MCKP", "ALG-SCORING", "ALG-TOPK", "F-COMPAT-CHECK"]
  decidedBy: ["ADR-001", "ADR-004"]
code: ["packages/engine/src/**"]
tests: ["packages/engine/src/**/*.test.ts", "packages/engine/bench/**"]
diagrams: ["docs/diagrams/class-engine.mmd"]
---

**Mục đích:** là lõi học thuật của đề tài - biến bài toán "chọn linh kiện tương thích và tối ưu hiệu năng trong ngân sách" thành bài toán CSP kết hợp MCKP và giải bằng thuật toán tìm kiếm có cắt tỉa.

**Mô tả:** Engine là package thuần (không I/O) nhận danh sách ứng viên còn hàng + yêu cầu (ngân sách, mục đích, tùy chọn, linh kiện cố định) và trả về tối đa 3 cấu hình kèm điểm, phân bổ ngân sách, công suất ước tính, cảnh báo và số liệu thống kê (số nút duyệt, số nhánh bị cắt bởi AC-3/FC/bound, thời gian). Cùng bộ luật tương thích C01-C14 được dùng ở server (nguồn chân lý) và ở client (kiểm tra tức thì trong Customizer).

**Quyết định chính:** ADR-001 tách thành package riêng để test độc lập và dùng chung FE/BE; ADR-004 Engine là bên quyết định linh kiện, LLM chỉ điều phối.

**Đánh giá:** harness `bench` chạy 4 biến thể (brute force giới hạn, backtracking, +FC, +AC-3 và B&B) trên catalog 50/100/250/500 sản phẩm - bảng số liệu cho chương 4.
