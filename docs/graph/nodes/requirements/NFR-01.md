---
id: NFR-01
type: requirement
title: "Hiệu năng của Optimization Engine: dưới 300 ms (p95) trên catalog khoảng 250 sản phẩm"
status: done
chapters: ["CH2"]
code: []
tests: []
diagrams: []
---

**Nguồn:** phiếu giao nhiệm vụ nội dung 5 (đánh giá thời gian phản hồi và hiệu năng của thuật toán gợi ý) và mục 3.1 (tối ưu hiệu năng truy vấn cho công cụ tương tác thời gian thực).

Engine giải xong trong dưới 300 ms ở phân vị 95 với catalog khoảng 250 sản phẩm. Có benchmark so sánh 4 biến thể (brute force giới hạn, backtracking, +forward checking, +AC-3 và Branch & Bound) trên catalog 50/100/250/500 sản phẩm để làm số liệu cho báo cáo.
