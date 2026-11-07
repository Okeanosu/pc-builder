---
id: ALG-NLU-FALLBACK
type: algorithm
title: "Bộ phân tích ngôn ngữ tiếng Việt theo luật cho chế độ dự phòng"
status: done
chapters: ["CH4", "CH5"]
links:
  decidedBy: ["ADR-018", "ADR-019"]
  refines: ["F-FALLBACK-NLU"]
code: ["apps/api/src/modules/chat/fallback/**"]
tests: ["apps/api/src/modules/chat/fallback/**/*.test.ts"]
diagrams: []
---

**Mục đích:** hiểu tối thiểu "ngân sách, mục đích, tùy chọn" từ câu tiếng Việt khi không có Gemini (không khóa API, hết quota, quá thời gian chờ).

**Mô tả (`nlu.ts`, `parseIntent(text, previous?)`):** văn bản được bỏ dấu để so khớp từ khóa, nhưng giữ dấu ở những chỗ bỏ dấu gây trùng ("đen" với "đến", "tỷ" với "Ti"). Mỗi thực thể được tách bằng biểu thức chính quy và từ điển từ khóa:
- **Ngân sách:** `25tr`, `25tr5`, `25 triệu rưỡi`, `25,5 triệu`, `25.000.000đ`, `25m`, `30 củ`, `1 tỷ` (cắt về trần 200 triệu); số viết bằng chữ ("hai mươi lăm", "hai lăm", "mười lăm"); khoảng ("20-25 triệu", "từ 18 đến 22 triệu", cận trên làm ngân sách). Phần đọc tiền có nhiều bẫy (số hiệu sản phẩm, "cũ" với "củ", so sánh hơn) và được xử lý bằng bộ luật ở ADR-018.
- **Mục đích:** đếm từ khóa của từng mục đích, đồng điểm thì từ khóa xuất hiện sớm nhất thắng (game, valorant → gaming; premiere, blender → graphics; "AI" viết hoa, deep learning → ai, trừ khi người dùng đang gọi bot như "AI ơi"; văn phòng, học tập → office).
- **Độ phân giải** 1080p/FHD, 2K/QHD/1440p, 4K ("GTX 1080" không bị đọc là độ phân giải); **hãng CPU/GPU** theo họ sản phẩm (ryzen, i5, rtx, rx 7800, arc) hoặc từ ngữ cảnh xung quanh, phủ định đảo hãng; **màu** (có phủ định), **Wi-Fi**, RAM, ổ cứng (1 TB = 1.000 GB), kích cỡ máy, GPU rời.
- **`wantsChange`:** rẻ hơn, mạnh hơn, đổi hãng GPU hoặc CPU. Được gộp lên ý định của lượt trước.

**Phản hồi (`responder.ts`):** thiếu ngân sách hoặc mục đích thì hỏi đúng một câu ngắn; ngân sách dưới mức tối thiểu thì giải thích mức tối thiểu; còn lại chạy `recommend_builds` qua cùng registry với đường AI và viết lời giải thích theo mẫu chỉ từ dữ liệu tool (nhãn và tổng giá, hai phần chia ngân sách lớn nhất, tên CPU và GPU, cảnh báo; nếu vô nghiệm thì nêu lý do và `minFeasibleBudget`). Không bịa linh kiện hoặc giá vì mọi số liệu đến từ Engine.

**Kiểm thử:** `nlu.test.ts` có hơn 50 test (gồm bảng các câu thăm dò hồi quy), cộng test của orchestrator và int test chat. Golden set 30 prompt (`apps/api/eval`) chấm ở chế độ này cho **26/30 theo chuẩn nghiêm ngặt** và 30/30 theo kỳ vọng riêng của chế độ luật (`fallbackExpect`); con số dẫn trong báo cáo là 26/30 vì bộ test do chính người phát triển viết khi đã biết phạm vi NLU (ADR-019). Độ trễ phân tích và giải p50 10 ms, p95 22 ms.

**Hạn chế:** đây là heuristic, câu phát biểu lạ có thể đọc sai và người dùng chỉ cần nói lại; không hiểu ngữ cảnh dài, nên các ca hỏi sản phẩm cụ thể (`search_products`) hoặc chỉnh một linh kiện (`modify_build`) mà chế độ luật không xử lý đúng được trình bày ở F-AI-ADVISOR.
