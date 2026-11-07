---
id: T-INT-RECO
type: test
title: "Integration test gợi ý cấu hình"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-08", "F-RECOMMEND", "NFR-05"]
code: []
tests: ["apps/api/src/modules/recommendation/**/*.int.test.ts"]
diagrams: []
---

`POST /recommendations` với 25 triệu, mục đích gaming trả 3 cấu hình (hiệu năng, cân bằng, tiết kiệm) trong ngân sách, đã lưu vào `builds` với nguồn FORM; lần gọi giống hệt trả `X-Cache: HIT` với đúng các id cũ và không lưu thêm; tăng phiên bản catalog thì trượt cache; ngân sách quá thấp trả 200 với `BUDGET_TOO_LOW` và ngân sách tối thiểu; người dùng đăng nhập sở hữu build của mình và không dùng chung cache với khách; trọng số đọc từ `purpose_weights`, thiếu thì dùng mặc định.
