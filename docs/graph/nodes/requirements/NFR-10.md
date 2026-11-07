---
id: NFR-10
type: requirement
title: "Nhất quán tiền tệ: số nguyên VND và định dạng vi-VN"
status: done
chapters: ["CH2"]
code: []
tests: []
diagrams: []
---

Mọi số tiền lưu và tính bằng số nguyên đồng (cột `bigint`, không dùng số thực); hiển thị bằng `Intl.NumberFormat('vi-VN')` kèm ký hiệu ₫ qua hàm `formatVnd` dùng chung cho cả web lẫn api.
