---
id: NFR-05
type: requirement
title: "Tính đúng đắn dữ liệu: AI không được bịa linh kiện hoặc giá"
status: done
chapters: ["CH2"]
code: []
tests: []
diagrams: []
---

**Nguồn:** spec §1 (anti-goal).

Mọi linh kiện và giá trong câu trả lời đến từ Engine hoặc cơ sở dữ liệu. Thẻ cấu hình (BuildCard) được dựng từ dữ liệu của tool chứ không từ văn bản LLM, nên giá hiển thị luôn khớp giá trong DB. Mọi cấu hình trả về phải tương thích 100% và nằm trong ngân sách.
