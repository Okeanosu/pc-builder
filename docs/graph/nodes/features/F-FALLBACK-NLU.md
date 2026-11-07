---
id: F-FALLBACK-NLU
type: feature
title: "Chế độ dự phòng: NLU tiếng Việt theo luật và giải thích theo mẫu"
status: done
chapters: ["CH4", "CH5"]
links:
  realizes: ["FR-17", "NFR-04"]
  dependsOn: ["M-CHAT", "ALG-NLU-FALLBACK", "F-ENGINE-CORE"]
  decidedBy: ["ADR-005"]
code: ["apps/api/src/modules/chat/fallback/**"]
tests: ["apps/api/src/modules/chat/fallback/**/*.test.ts"]
diagrams: []
---

**Mục đích:** bảo đảm buổi demo và người dùng thật không bao giờ gặp "trang trắng" khi Gemini hết quota hoặc mất mạng.

**Mô tả:** khi không có `GEMINI_API_KEY`, Gemini trả 429/5xx hoặc quá thời gian chờ, orchestrator chuyển sang parser rule-based tách ngân sách (`25tr`, `25 triệu`, `25.000.000`, `25m`), mục đích (từ khóa game, valorant, đồ họa, premiere, AI, văn phòng...), độ phân giải, hãng, màu, Wi-Fi. Thiếu ngân sách hoặc mục đích thì hỏi lại theo mẫu. Sau đó gọi đúng Engine như chế độ AI và sinh lời giải thích từ số liệu (phân bổ %, bậc CPU/GPU, dư công suất nguồn). Giao diện hiển thị nhãn "Chế độ dự phòng" (phần web thuộc SCR-ADVISOR, chưa làm). Code: `fallback/nlu.ts` (parser) và `fallback/responder.ts` (câu hỏi lại, gọi `recommend_builds`, giải thích theo mẫu); ý định của phiên được giữ giữa các lượt nên "rẻ hơn", "đổi card AMD" hiểu theo cấu hình trước.
