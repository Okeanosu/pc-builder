---
id: ALG-NLU-FALLBACK
type: algorithm
title: "Bộ phân tích ngôn ngữ tiếng Việt theo luật cho chế độ dự phòng"
status: done
chapters: ["CH4", "CH5"]
links:
  refines: ["F-FALLBACK-NLU"]
code: ["apps/api/src/modules/chat/fallback/**"]
tests: ["apps/api/src/modules/chat/fallback/**/*.test.ts"]
diagrams: []
---

**Mục đích:** hiểu tối thiểu "ngân sách, mục đích, tùy chọn" từ câu tiếng Việt khi không có Gemini.

**Mô tả:** chuẩn hóa văn bản (chữ thường, bỏ dấu để so khớp từ khóa nhưng vẫn giữ bản có dấu để hiển thị), rồi tách từng thực thể bằng biểu thức chính quy và từ điển từ khóa:
- **Ngân sách:** `25tr`, `25 triệu`, `25.000.000`, `25m`, `1 tỷ` (cắt về trần ngân sách).
- **Mục đích:** game/valorant/pubg/lol → gaming; đồ họa/premiere/blender/dựng phim → graphics; AI/deep learning/lập trình → ai; văn phòng/học tập → office.
- **Độ phân giải** 1080p/2K/4K, **hãng** AMD/Intel/NVIDIA/RTX/Radeon, **màu** trắng/đen, **Wi-Fi**.

Thiếu ngân sách hoặc mục đích thì sinh câu hỏi lại theo mẫu. Bộ kiểm thử gồm tối thiểu 40 câu tiếng Việt đa dạng cách viết.
