---
id: T-API-NLU
type: test
title: "Unit test NLU dự phòng tiếng Việt (tối thiểu 40 câu)"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-17", "NFR-04", "ALG-NLU-FALLBACK", "F-FALLBACK-NLU"]
code: []
tests: ["apps/api/src/modules/chat/fallback/**/*.test.ts"]
diagrams: []
---

Bảng câu mẫu đa dạng cách viết ngân sách, mục đích, hãng, màu; kiểm tra các câu thiếu thông tin sinh câu hỏi lại. `fallback/nlu.test.ts` hiện có hơn 100 câu, gồm cả các bẫy như số model ("i5 13600K", "RTX 4060") không bị đọc thành tiền, "2K" là độ phân giải, "cũ" khác "củ", và các câu chỉnh sửa tương đối ("bớt 3 triệu", "mạnh hơn bản trước 5 triệu").
