---
id: NFR-02
type: requirement
title: "Độ trễ hội thoại: một câu hỏi cho ra 3 cấu hình trong tối đa 8 giây"
status: planned
chapters: ["CH2"]
code: []
tests: []
diagrams: []
---

**Nguồn:** spec §1 (tiêu chí thành công của buổi demo bảo vệ).

Từ lúc gửi tin nhắn đến lúc có 3 cấu hình hiển thị không quá 8 giây (kể cả gọi Gemini). Build card được hiển thị ngay khi Engine trả kết quả, trước khi lời giải thích kịp stream xong; có giới hạn 4 vòng gọi tool mỗi lượt và timeout Gemini 20 giây rồi chuyển dự phòng.
