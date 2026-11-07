---
id: SCR-ADVISOR
type: screen
title: "AI PC Advisor toàn màn hình"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/*/advisor/**", "apps/web/src/features/advisor/**", "apps/web/src/stores/chat.ts", "apps/web/src/components/ChatWidget.tsx"]
tests: ["apps/web/src/features/advisor/**/*.test.ts", "apps/web/src/features/advisor/**/*.test.tsx", "apps/web/src/stores/chat.test.ts"]
diagrams: []
---

**Route:** `/advisor` (CSR, toàn trang Workshop than chì). Ảnh chụp 375/1440: `docs/design/screenshots/advisor/`.

**Bố cục:** máy tính chia hai cột - hội thoại (≈5/12) và bảng "So sánh cấu hình" (≈7/12), mỗi cột cuộn riêng, chiều cao vừa khung nhìn trừ header của site (đo bằng `useHeaderOffset`). Điện thoại dùng 2 tab "Trò chuyện" / "Cấu hình (3)"; tin nhắn trợ lý có khối tóm tắt 3 cấu hình, bấm vào thì chuyển sang tab so sánh.

**Luồng "wow":** gõ câu (hoặc bấm chip gợi ý: Gaming 25 triệu, Đồ họa 40 triệu, AI/Deep learning 60 triệu, Văn phòng 12 triệu, Máy chơi game 2K màu trắng 30 triệu) → `ToolStatusChip` hiện spinner theo sự kiện `tool start` với nhãn của server, chuyển thành dấu check khi `tool end` → 3 `BuildCard` trượt vào so le 110 ms (AllocationBar chạy, LED PerfMeter sáng dần) → lời giải thích markdown stream bên dưới với con trỏ nhấp nháy. Ở chế độ dự phòng server trả cả lượt trong vài chục mili giây, nên giao diện giữ spinner tối thiểu 0,7 s và nhả chữ đều (khoảng 1 s để bắt kịp); `prefers-reduced-motion` tắt toàn bộ hiệu ứng và hiện chữ ngay.

**BuildCard:** nhãn (Tối ưu hiệu năng / Cân bằng / Tiết kiệm), CompatibilityBadge từ `warnings`, tổng giá và tiền còn dư so với ngân sách, PerfMeter, AllocationBar, 8 dòng linh kiện (danh mục, tên, giá), nút "Mở trong Customizer" (`/builder?build=<id>`), "Thêm cả bộ vào giỏ" (`POST /cart/builds/:id`, làm mới badge giỏ), "Báo giá PDF", "Chia sẻ" (sao chép `/builds/<id>`).

**Kỹ thuật:** `features/advisor/sse.ts` đọc SSE bằng `fetch` + `ReadableStream` (gửi cookie và bearer); parser chịu được ranh giới chunk ở mọi vị trí, CRLF, nhiều dòng `data:`, heartbeat `: ping` và ký tự UTF-8 bị cắt giữa chunk; lỗi HTTP trước luồng (429, 5xx, mất mạng) thành câu tiếng Việt. `useChatStore` (Zustand) giữ id phiên trong `localStorage` `pcb.chat.session` (bọc try/catch), tạo phiên lười khi gửi tin đầu tiên, nạp lại lịch sử bằng `GET /chat/sessions/:id` sau khi xác thực xong, bỏ phiên 404/403 và gửi lại một lần với phiên mới, hỗ trợ Dừng (AbortController), Gửi lại và "Cuộc trò chuyện mới". `?q=` được gửi tự động đúng một lần rồi xóa khỏi URL (nút "Hỏi AI tối ưu" của Customizer dùng đường này). Nhãn "Chế độ dự phòng" hiện cạnh ô nhập khi `mode = FALLBACK`.

**Widget chat nổi:** `components/ChatWidget.tsx` - nút góc phải dưới mở Drawer dùng chung store và component, có liên kết "Mở toàn màn hình", tự ẩn ở `/advisor`; được gắn vào layout `(shop)` khi tích hợp.
