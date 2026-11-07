---
id: ALG-TOPK
type: algorithm
title: "Chọn top-K cấu hình đa dạng và gắn nhãn"
status: done
chapters: ["CH4", "CH5"]
links:
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-BNB"]
code: ["packages/engine/src/topk.ts"]
tests: ["packages/engine/src/topk.test.ts", "packages/engine/src/labels.test.ts"]
diagrams: []
---

**Mục đích:** trả cho người dùng 2-3 lựa chọn thật sự khác nhau thay vì ba biến thể gần giống.

**Mô tả:** giữ heap K = 3 theo nhãn: **Tối ưu hiệu năng** (điểm cao nhất), **Cân bằng** (điểm/giá cao nhất), **Tiết kiệm** (điểm đạt ít nhất 85% mức tốt nhất, giá thấp nhất). Các cấu hình phải khác nhau về CPU hoặc GPU. Cấu hình có tổng giá dưới 85% ngân sách bị cảnh báo là chưa tận dụng hết ngân sách (luật C14 mềm).
