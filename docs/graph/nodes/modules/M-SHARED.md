---
id: M-SHARED
type: module
title: "Package @pc/shared: kiểu dữ liệu, Zod schema và hằng số dùng chung"
status: done
chapters: ["CH4"]
links:
  realizes: ["NFR-10"]
  decidedBy: ["ADR-001"]
code: ["packages/shared/src/**"]
tests: ["apps/api/src/lib/products.test.ts"]
diagrams: []
---

**Mục đích:** hợp đồng dữ liệu duy nhất giữa web, api và engine, để ba nơi không bao giờ hiểu khác nhau về cùng một khái niệm.

**Nội dung:**
- `constants.ts`: 8 danh mục (`CATEGORY_KEYS`), 4 mục đích (`PURPOSES`), vai trò, trạng thái đơn và nhãn tiếng Việt, loại đơn, nguồn cấu hình, nhãn cấu hình (performance/balanced/budget), chế độ chat, giới hạn ngân sách 5-200 triệu.
- `specs.ts`: Zod schema thông số cho từng danh mục (socket AM4/AM5/LGA1700/LGA1851, DDR4/DDR5, form factor...), `SpecField` mô tả form động, `Benchmark`.
- `schemas.ts`: schema đầu vào API (yêu cầu gợi ý, kiểm tra tương thích, truy vấn sản phẩm, đơn hàng...).
- `dto.ts`: kiểu dữ liệu trả về (ProductDTO, BuildDTO, OrderDTO, PaymentInfoDTO, ChatSessionDTO, RecommendationResultDTO...).
- `chat-events.ts`: các sự kiện SSE của chat (session, tool, builds, products, token, error, done) và dạng lỗi chuẩn `ApiErrorBody`.
- `format.ts`: `formatVnd` - định dạng `vi-VN` kèm ₫.

**Quyết định:** tiền là số nguyên VND (NFR-10); kiểu suy ra từ Zod để schema và kiểu không lệch nhau.
