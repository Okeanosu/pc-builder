---
id: F-RECOMMEND
type: feature
title: "Gợi ý cấu hình theo form (ngân sách, mục đích, tùy chọn)"
status: planned
chapters: ["CH1", "CH4", "CH5"]
links:
  realizes: ["FR-08", "UC-04", "NFR-01"]
  dependsOn: ["M-RECOMMENDATION", "F-ENGINE-CORE", "E-PURPOSE-WEIGHT", "E-BUILD"]
  decidedBy: ["ADR-004"]
  shownIn: ["SCR-HOME", "SCR-ADVISOR"]
code: ["apps/api/src/modules/recommendation/**", "apps/web/src/features/recommend/**"]
tests: ["apps/api/src/modules/recommendation/**/*.int.test.ts"]
diagrams: []
---

**Mục đích:** cho người dùng không muốn chat vẫn nhận 2-3 cấu hình tối ưu chỉ với một form ngắn.

**Mô tả:** `POST /recommendations` nhận `{budget, purpose, preferences}`, nạp ứng viên còn hàng (cache Redis 5 phút theo danh mục), nạp ma trận trọng số từ bảng `purpose_weights`, gọi Engine và lưu các cấu hình thành `builds` (nguồn FORM). Kết quả cache theo băm của request trong 10 phút. Nếu không khả thi, trả lý do (ngân sách quá thấp, không có tổ hợp tương thích) kèm ngân sách tối thiểu khả thi.
