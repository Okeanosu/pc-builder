---
id: NFR-09
type: requirement
title: "Khả năng truy vết từ yêu cầu đến code và test (Spec-Code Graph)"
status: done
chapters: ["CH2"]
code: []
tests: []
diagrams: []
---

**Nguồn:** spec §1 và §8; mục tiêu "giảng viên hỏi chỗ này code ở đâu thì trả lời được".

Mọi yêu cầu truy vết được tới use case, tính năng, file code, test và chương báo cáo; công cụ `pnpm graph:check` báo lỗi khi liên kết hỏng hoặc node đã `done` mà không còn file tương ứng.
