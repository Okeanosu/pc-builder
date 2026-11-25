---
id: SCR-HOME
type: screen
title: "Trang chủ"
status: done
chapters: ["CH4"]
code: ["apps/web/src/app/[(]shop[)]/page.tsx", "apps/web/src/app/[(]shop[)]/layout.tsx", "apps/web/src/features/home/**", "apps/web/src/features/catalog/ShopHeader.tsx"]
tests: []
diagrams: []
---

**Route:** `/` (SSR, sản phẩm nổi bật stream sau)

Hero là ô nhập lớn của AI Advisor trên bề mặt Workshop than chì: người dùng gõ nhu cầu hoặc bấm một trong bốn gợi ý ("Gaming 25 triệu", "Đồ họa 40 triệu", "AI/Deep learning 60 triệu", "Văn phòng 12 triệu") và được chuyển sang `/advisor?q=<nội dung>`; trang Advisor tự gửi câu đó. Bên cạnh là ba bước "kể nhu cầu → Engine chọn linh kiện trong kho → so sánh 3 cấu hình". Nút phụ "Tự lắp cấu hình" dẫn tới `/builder`.

Bên dưới: lưới 8 danh mục (bản vẽ kỹ thuật + ký hiệu in lụa), "Sản phẩm nổi bật" (mỗi danh mục một sản phẩm còn hàng có hiệu năng cao nhất, lấy lúc request sau `connection()` rồi cache vài phút để tồn kho luôn mới) và khối "Vì sao chọn chúng tôi" giải thích bảo đảm tương thích (bộ luật CSP), tối ưu ngân sách (MCKP) và VietQR tự xác nhận.

Layout `(shop)` dựng SiteHeader (danh mục lấy từ API, cache theo giờ bằng `use cache`; số lượng giỏ từ React Query; menu tài khoản có mục "Quản trị" cho STAFF/ADMIN) và SiteFooter, chừa chỗ gắn ChatWidget. Cấu hình mẫu dạng BuildCard trong wireframe không đặt ở trang chủ vì BuildCard thuộc phần Advisor; các chip gợi ý đảm nhận vai trò đó.
