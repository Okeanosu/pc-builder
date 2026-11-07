# Độ phủ & tiến độ

Sinh tự động bởi `pnpm graph` — không sửa tay.

## Số node theo loại và trạng thái

| Loại | planned | in-progress | done | Tổng |
| --- | ---: | ---: | ---: | ---: |
| Yêu cầu | 27 | 0 | 2 | 29 |
| Use case | 16 | 0 | 0 | 16 |
| Tính năng | 22 | 0 | 1 | 23 |
| Module | 16 | 0 | 5 | 21 |
| API | 15 | 0 | 1 | 16 |
| Thực thể dữ liệu | 0 | 0 | 15 | 15 |
| Thuật toán | 8 | 0 | 0 | 8 |
| Luật ràng buộc | 14 | 0 | 0 | 14 |
| Màn hình | 17 | 0 | 0 | 17 |
| Kiểm thử | 22 | 0 | 2 | 24 |
| Quyết định thiết kế | 0 | 0 | 11 | 11 |
| Chương báo cáo | 6 | 0 | 0 | 6 |

## Yêu cầu chưa có use case / tính năng (0)

Cần thêm node `realizes` trỏ tới yêu cầu.

_Không có._

## Yêu cầu chưa có test (0)

Cần thêm node `test` (`verifies`) hoặc khai báo `tests:` cho tính năng.

_Không có._

## Yêu cầu chưa có code thực tế (8)

Tính năng đã khai báo `code:` nhưng chưa có file nào khớp (hoặc chưa khai báo).

- **FR-12** — Quản trị sản phẩm với form schema động (JSONB)
- **FR-13** — Quản trị tồn kho và bảng điểm benchmark
- **FR-14** — Quản trị ma trận trọng số thuật toán và hệ số ưu tiên thương mại
- **FR-15** — Quản trị đơn hàng và vòng đời đơn
- **FR-16** — Thống kê doanh thu và đối soát thanh toán
- **NFR-04** — Tính sẵn sàng: hệ thống không phụ thuộc cứng vào dịch vụ AI bên ngoài
- **NFR-07** — Đóng gói và triển khai bằng Docker trên máy chủ đám mây
- **NFR-11** — Khả năng sử dụng: đánh giá bằng khảo sát người dùng thật (UAT, điểm SUS)

## Yêu cầu chưa có test thực tế (27)

Chưa có file test nào khớp các glob `tests:` của tính năng / node test liên quan.

- **FR-01** — Duyệt danh mục linh kiện và lọc theo thông số kỹ thuật động
- **FR-02** — Xem chi tiết sản phẩm với bảng thông số và điểm benchmark
- **FR-03** — Đăng ký, đăng nhập và phân quyền theo vai trò
- **FR-04** — Giỏ hàng cho khách vãng lai và khách đã đăng nhập
- **FR-05** — Đặt hàng linh kiện lẻ và đơn lắp ráp nguyên bộ
- **FR-06** — Thanh toán VietQR động và tự động xác nhận
- **FR-07** — AI PC Advisor: chatbot tiếng Việt tư vấn cấu hình bằng ngôn ngữ tự nhiên
- **FR-08** — Gợi ý 2-3 cấu hình tối ưu theo ngân sách và mục đích (Smart PC Builder)
- **FR-09** — Lắp ráp PC tương tác với kiểm tra tương thích thời gian thực
- **FR-10** — Lưu và chia sẻ cấu hình PC
- **FR-11** — Xuất báo giá cấu hình dạng PDF
- **FR-12** — Quản trị sản phẩm với form schema động (JSONB)
- **FR-13** — Quản trị tồn kho và bảng điểm benchmark
- **FR-14** — Quản trị ma trận trọng số thuật toán và hệ số ưu tiên thương mại
- **FR-15** — Quản trị đơn hàng và vòng đời đơn
- **FR-16** — Thống kê doanh thu và đối soát thanh toán
- **FR-17** — Chế độ dự phòng của chatbot khi không dùng được Gemini
- **FR-18** — Chống bán vượt tồn kho khi đặt hàng đồng thời
- **NFR-01** — Hiệu năng của Optimization Engine: dưới 300 ms (p95) trên catalog khoảng 250 sản phẩm
- **NFR-02** — Độ trễ hội thoại: một câu hỏi cho ra 3 cấu hình trong tối đa 8 giây
- **NFR-04** — Tính sẵn sàng: hệ thống không phụ thuộc cứng vào dịch vụ AI bên ngoài
- **NFR-05** — Tính đúng đắn dữ liệu: AI không được bịa linh kiện hoặc giá
- **NFR-06** — Giao diện tiếng Việt, đáp ứng đa kích thước màn hình và đạt WCAG AA
- **NFR-07** — Đóng gói và triển khai bằng Docker trên máy chủ đám mây
- **NFR-08** — Khả năng kiểm thử: Engine đạt tối thiểu 90% branch coverage
- **NFR-10** — Nhất quán tiền tệ: số nguyên VND và định dạng vi-VN
- **NFR-11** — Khả năng sử dụng: đánh giá bằng khảo sát người dùng thật (UAT, điểm SUS)

## Node chưa `done` nhưng code đã tồn tại (42)

Rà soát: có thể đã hoàn thành — cập nhật `status`.

- **ALG-BNB** (planned) — Branch and Bound cho mục tiêu tối đa hóa điểm trong ngân sách
- **ALG-FC** (planned) — Forward Checking trong lúc gán biến
- **ALG-MCKP** (planned) — Mô hình Bài toán cái túi đa lựa chọn (MCKP) để phân bổ ngân sách
- **ALG-TOPK** (planned) — Chọn top-K cấu hình đa dạng và gắn nhãn
- **API-AUTH** (planned) — API xác thực
- **API-BUILDS** (planned) — API cấu hình đã lưu
- **API-CART** (planned) — API giỏ hàng
- **API-CATALOG** (planned) — API danh mục và sản phẩm
- **API-CHAT** (planned) — API chat và luồng SSE
- **API-COMPAT** (planned) — API kiểm tra tương thích
- **API-ORDERS** (planned) — API đơn hàng
- **API-PAYMENTS** (planned) — API thanh toán
- **API-QUOTES** (planned) — API báo giá PDF
- **API-RECO** (planned) — API gợi ý cấu hình
- **F-AI-ADVISOR** (planned) — AI PC Advisor: chatbot Gemini điều phối Engine qua function calling
- **F-AUTH** (planned) — Xác thực JWT và phân quyền RBAC
- **F-BUILD-SHARE** (planned) — Lưu, chia sẻ và nhân bản cấu hình
- **F-CART** (planned) — Giỏ hàng (khách vãng lai ở Redis, người dùng ở DB, gộp khi đăng nhập)
- **F-CATALOG** (planned) — Danh mục sản phẩm, lọc theo thông số JSONB và trang chi tiết
- **F-COMPAT-CHECK** (planned) — Kiểm tra tương thích linh kiện theo bộ luật C01-C14
- **F-ENGINE-CORE** (planned) — Optimization Engine: bộ giải CSP + MCKP thuần TypeScript
- **F-INVENTORY-LOCK** (planned) — Chống bán vượt: cập nhật có điều kiện trong transaction và giữ hàng 15 phút
- **F-ORDER** (planned) — Đặt hàng lẻ / nguyên bộ và vòng đời đơn
- **F-PAYMENT-VIETQR** (planned) — Thanh toán VietQR động, webhook SePay và giả lập
- **F-QUOTE-PDF** (planned) — Xuất báo giá PDF tiếng Việt
- **F-RECOMMEND** (planned) — Gợi ý cấu hình theo form (ngân sách, mục đích, tùy chọn)
- **F-UI-DESIGN-SYSTEM** (planned) — Hệ thống thiết kế "Tech Workshop" và các thành phần giao diện
- **M-ADMIN** (planned) — Module admin: sản phẩm, tồn kho, benchmark, trọng số, đơn hàng, thống kê
- **M-AUTH** (planned) — Module auth: đăng ký, đăng nhập, refresh, đăng xuất
- **M-BUILDS** (planned) — Module builds: lưu, lấy và nhân bản cấu hình
- **M-CART** (planned) — Module cart: giỏ hàng Redis/DB và gộp giỏ
- **M-CATALOG** (planned) — Module catalog: danh mục, sản phẩm, facet lọc động
- **M-CHAT-LLM** (planned) — Lớp trừu tượng LlmClient và bộ chọn nhà cung cấp
- **M-CHAT** (planned) — Module chat: phiên chat, SSE, orchestrator Gemini và chế độ dự phòng
- **M-COMPATIBILITY** (planned) — Module compatibility: API kiểm tra tương thích
- **M-ENGINE** (planned) — Package @pc/engine: Optimization Engine thuần TypeScript
- **M-ORDERS** (planned) — Module orders: tạo đơn, máy trạng thái, giữ hàng, sweeper
- **M-PAYMENTS** (planned) — Module payments: VietQR, webhook SePay, giả lập
- **M-QUOTES** (planned) — Module quotes: xuất báo giá PDF
- **M-RECOMMENDATION** (planned) — Module recommendation: API gợi ý cấu hình
- **M-WEB** (planned) — Ứng dụng web Next.js: storefront, advisor, builder, admin
- **SCR-HOME** (planned) — Trang chủ

## Số node theo chương

| Chương | Yêu cầu | Use case | Tính năng | Module | API | Thực thể dữ liệu | Thuật toán | Luật ràng buộc | Màn hình | Kiểm thử | Quyết định thiết kế | Tổng |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CH1 — Chương 1 - Giới thiệu | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| CH2 — Chương 2 - Khảo sát và phân tích yêu cầu | 29 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 45 |
| CH3 — Chương 3 - Công nghệ sử dụng | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 6 |
| CH4 — Chương 4 - Thiết kế, triển khai và đánh giá | 0 | 0 | 23 | 21 | 16 | 15 | 8 | 14 | 17 | 24 | 10 | 148 |
| CH5 — Chương 5 - Giải pháp và đóng góp nổi bật | 0 | 0 | 11 | 0 | 0 | 0 | 8 | 0 | 0 | 0 | 4 | 23 |
| CH6 — Chương 6 - Kết luận | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 4 |
