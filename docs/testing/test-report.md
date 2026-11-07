# Báo cáo kiểm thử và đánh giá hệ thống PC Builder

> Tư liệu cho Chương 4 — "Thử nghiệm và đánh giá". Mọi con số dưới đây được đo trong task QA ngày 2026-11-08 (giờ Việt Nam) trên môi trường ghi ở mục 1, trừ khi ghi rõ là trích từ tài liệu khác. Kết quả không được làm tròn theo hướng có lợi: độ trễ làm tròn tới 0,1 ms gần nhất (sai số ≤ 0,05 ms), thông lượng làm tròn xuống tới 0,1 yêu cầu/giây.

## 0. Tóm tắt

| Hạng mục | Kết quả |
| --- | --- |
| Kiểm thử tự động (unit + integration) | 897 ca trên 70 tệp, tất cả đạt (Engine 175, API 529, Web 166, Graph CLI 27) |
| Độ phủ nhánh `packages/engine` | 98,85% (mục tiêu ≥ 90%) |
| E2E Playwright | 6 test (5 test chạy ở cả 1440 px và 390 px, smoke chạy 1 khung nhìn) + bước đăng nhập; 3 lần chạy độc lập, mỗi test lặp 3 lần/lần chạy (smoke và a11y có từ lần 2): 87 lượt thực thi, 0 lỗi, 0 lượt chập chờn |
| Hiệu năng Engine (trích bench) | p95 11,5 ms trên catalog 250 sản phẩm (mục tiêu < 300 ms) |
| Hiệu năng API gợi ý (autocannon, không cache) | 1 kết nối: p95 10,9 ms; 10 kết nối: p95 52,2 ms, 228,3 yêu cầu/s, 0 lỗi |
| Độ trễ chat SSE (dự phòng) | sự kiện `builds` p95 19,5 ms; cả lượt p95 23,2 ms (mục tiêu ≤ 8 s) |
| Chất lượng AI (golden set, chế độ dự phòng) | nghiêm ngặt 26/30; theo khả năng thiết kế của chế độ luật 30/30; cấu hình hợp lệ 69/69 |
| Test chập chờn ECONNRESET | không tái hiện được: 0 lỗi trong 2.116 lượt ca API, 195 lượt dưới tải CPU nặng, 900 yêu cầu đăng nhập thăm dò |
| Lỗi phát hiện | 2 BUG (1 bảo mật mức trung bình, 1 khả năng truy cập mức thấp), 3 quan sát và các hạn chế đo, xem mục 9 |

## 1. Môi trường kiểm thử

| Thành phần | Phiên bản / cấu hình |
| --- | --- |
| Máy | Apple M3, 8 nhân, RAM 24 GB, macOS 14.6 (Darwin 23.6.0) |
| Node.js | v22.20.0 (do pnpm 10.28.1 chạy; `node` của shell là v24.18.0 nhưng mọi script dùng v22.20.0) |
| CSDL | PostgreSQL 16.11 (Docker `postgres:16-alpine`, cổng 5433), CSDL riêng `pcbuilder_e2e` |
| Bộ nhớ đệm | Redis 7.4.12 (Docker `redis:7-alpine`, cổng 6380), db 7 dành riêng cho QA |
| Công cụ | Vitest 5.0.5, Supertest 7.3.2, Playwright 1.64.1 + Chromium 156.0.8078.4, autocannon 8.0.0, @vitest/coverage-v8 5.0.5 |
| Ứng dụng | API Express 5 ở `NODE_ENV=development` (bật giả lập thanh toán, log pino bật), `GEMINI_API_KEY` rỗng nên chatbot ở **chế độ dự phòng** (NLU luật + mẫu câu); web Next.js 16.4.3 bản build production (`next build` + `next start`) |
| Cổng | API 4104, web 3104 |
| Dữ liệu | seed chuẩn: 8 danh mục, 240 sản phẩm, 3 tài khoản (admin/staff/khách), 4 bộ trọng số; E2E seed lại CSDL và xóa Redis db 7 trước mỗi lần chạy |

**Lưu ý về độ tin cậy số đo:** máy dùng chung với các agent khác đang build/test song song. Tải trung bình 1 phút lúc bắt đầu mỗi phép đo được ghi kèm (3,3–8,8 ở các phép đo hiệu năng). Số liệu hiệu năng vì vậy là số đo trên máy phát triển có tải nền, không phải máy chủ chuyên dụng; chúng phù hợp để so sánh tương đối giữa các kịch bản hơn là cam kết tuyệt đối.

## 2. Chiến lược và tháp kiểm thử

Số lượng lấy từ chính các lần chạy trong task này (bảng kết quả JSON của Vitest/Playwright), không đếm tay.

| Tầng | Gói / công cụ | Tệp | Ca kiểm thử | Thời gian chạy | Ghi chú |
| --- | --- | ---: | ---: | ---: | --- |
| Unit — Engine | `packages/engine`, Vitest | 9 | 175 | 1,6 s | luật C01–C15, AC-3, FC, B&B, top-K, vô nghiệm |
| Unit — API (hàm thuần) | `apps/api`, Vitest | 16 | 332 | — | NLU dự phòng (113 ca), máy trạng thái đơn (75 ca), VietQR, validator specSchema, orchestrator với LLM giả… |
| Integration — API | `apps/api`, Vitest + Supertest, Postgres + Redis thật | 21 | 197 | — | 19 tệp `*.int.test.ts` (180 ca) + `app.test.ts` (2) + `seed.test.ts` (15) |
| (cả gói API) | | 37 | 529 | 110,4–111,7 s | 4 lần chạy, xem mục 8 |
| Unit — Web | `apps/web`, Vitest + jsdom | 22 | 166 | 1,0 s | store, parser SSE, ánh xạ bộ lọc ↔ URL, form… |
| Unit — Spec-Code Graph | `tools/graph`, Vitest | 2 | 27 | 0,2 s | |
| E2E | `e2e/`, Playwright | 6 | 6 (+1 bước đăng nhập) | ~3 phút/lần chạy (gồm build web) | 1440 px và 390 px |
| Hiệu năng | bench Engine, autocannon, đo SSE | — | 3 kịch bản tải + 20 lượt chat | 90 s + 2 s | mục 5 |
| Chất lượng AI | `apps/api/eval` | — | 30 kịch bản | — | mục 6 |
| UAT | Google Form (SUS) | — | — | — | chưa thực hiện trong task này |

Tổng số ca tự động không kể E2E: 175 + 529 + 166 + 27 = **897**, tất cả đạt.

## 3. Độ phủ mã

Lệnh: `pnpm --filter @pc/engine test -- --coverage` (V8, phạm vi `src/**/*.ts` trừ `index.ts`, `types.ts` và tệp test; ngưỡng nhánh trong cấu hình là 90%).

| Phạm vi | Câu lệnh | Nhánh | Hàm | Dòng |
| --- | ---: | ---: | ---: | ---: |
| **Toàn bộ `packages/engine/src`** | 99,51% | **98,85%** | 99,44% | 99,63% |
| `domains.ts` | 99,43% | 97,12% | 100% | 99,31% (dòng 322) |
| `scoring.ts` | 100% | 97,33% | 100% | 100% (nhánh dòng 70, 179) |
| `search.ts` | 98,63% | 98,96% | 97,22% | 99,14% (dòng 150, 295) |
| các tệp còn lại | 100% | 100% | 100% | 100% |

Yêu cầu NFR-08 (≥ 90% branch coverage cho Engine) **đạt**.

**API:** chưa đo độ phủ. `@vitest/coverage-v8` chỉ là devDependency của `@pc/engine`; thêm vào `@pc/api` là thêm phụ thuộc, nằm ngoài quyền của task QA. Đây là một hạn chế của báo cáo; độ bao phủ chức năng của API được thể hiện qua ma trận truy vết ở mục 10.

## 4. Kiểm thử đầu-cuối (E2E)

### 4.1 Cách dựng

- `e2e/playwright.config.ts` tự khởi động hai server qua `webServer`: API bằng `e2e/scripts/start-api.mts` (chạy migration, seed lại `pcbuilder_e2e`, xóa Redis db 7 rồi mới khởi động server; từ chối chạy nếu tên CSDL không chứa "e2e") và web bằng `next build` + `next start`.
- Hai dự án trình duyệt: `desktop-1440` (Chromium 1440×900) và `mobile-390` (Chromium, khung nhìn 390×844, cảm ứng, UA Android). Dự án `smoke` chạy riêng, không cần đăng nhập. `workers: 1` vì các kịch bản dùng chung CSDL và kịch bản admin đổi trọng số toàn cục; `retries: 0` khi chạy cục bộ.
- Đăng nhập admin: API giới hạn 5 lần/phút/IP, nên dự án `setup` đăng nhập **một lần** qua giao diện và lưu cookie; refresh token xoay vòng mỗi lần tải trang, nên sau mỗi test cookie mới nhất được ghi đè lại vào tệp trạng thái.
- Bộ chọn dựa trên vai trò và nhãn (`getByRole`, `getByLabel`), không có `sleep` cố định; ảnh QR từ `img.vietqr.io` được thay bằng ảnh 1×1 cục bộ để kết quả không phụ thuộc mạng ngoài.

### 4.2 Kịch bản

| Mã | Tệp | Nội dung kiểm chứng |
| --- | --- | --- |
| E2E-1 | `advisor-to-payment.spec.ts` | Trang chủ → gõ "chơi game 25 triệu" vào ô hero → `/advisor`; luồng SSE trả `done` ở chế độ FALLBACK với 3 cấu hình (Tối ưu hiệu năng / Cân bằng / Tiết kiệm), mỗi cấu hình 8 linh kiện, ≤ 25.000.000 ₫ và không có lỗi khi kiểm lại bằng `POST /compatibility/check`; 3 BuildCard hiện ra → "Thêm cả bộ vào giỏ" → giỏ có nhóm cấu hình "8 linh kiện · Đủ bộ" → "Đặt lắp ráp" → điền họ tên, số điện thoại, địa chỉ (khách vãng lai) → đơn BUILD 201, tổng = tạm tính + phí lắp ráp → trang thanh toán có ảnh VietQR đúng `amount` và `addInfo` = mã đơn → `POST /payments/:code/simulate` → trang tự chuyển sang "Đã nhận thanh toán", đơn ở trạng thái PAID |
| E2E-2 | `customizer-conflict.spec.ts` | Mở cấu hình gợi ý thật trong Customizer (`/builder?build=<id>`) → đổi CPU sang CPU AM5 và mainboard sang bo LGA1700 (chọn từ API catalog lúc chạy) → hai slot hiện "C01 Socket CPU (AM5) không khớp mainboard (LGA1700)", huy hiệu "Xung đột" màu đỏ → "Lưu & chia sẻ" → `POST /builds` 422 `INCOMPATIBLE` có C01 trong `details`, toast "C01: …", không rời trang |
| E2E-3 | `admin-weights.spec.ts` | Admin (đã đăng nhập qua giao diện) mở `/admin/weights` → đặt trọng số GPU của "Chơi game" 0,60, chia lại 7 danh mục còn lại theo tỷ lệ cho tổng 1,00 → Lưu → gợi ý gaming 25 triệu mới có `X-Cache: MISS` và tỷ trọng GPU của cấu hình hiệu năng lớn hơn trước → "Khôi phục mặc định" + Lưu và so khớp với bản gốc |
| E2E-4 | `a11y.spec.ts` (2 test) | 6 trang chính: `lang="vi"`, 1 `main`, có `banner`, đúng 1 `h1`, không cuộn ngang; biểu mẫu thanh toán: thứ tự Tab, vòng focus nhìn thấy, gửi rỗng bằng Enter → `aria-invalid`, lỗi gắn qua `aria-describedby`, focus về ô lỗi đầu tiên |
| E2E-5 | `smoke.spec.ts` | `/api/health` ok, trang chủ tải được, một lượt chat có cấu hình (dùng được cho máy chủ đã triển khai qua `E2E_BASE_URL`) |

Số đo của E2E-3 trên dữ liệu seed (tỷ trọng GPU trong tổng giá cấu hình, trước → sau):

| Cấu hình | Trước (GPU 0,42) | Sau (GPU 0,60) |
| --- | ---: | ---: |
| Tối ưu hiệu năng | 0,5694 | 0,6561 |
| Cân bằng | 0,3194 | 0,6246 |
| Tiết kiệm | 0,4139 | 0,4880 |

(Ở 3/18 lượt — lượt E2E-3 cuối cùng của mỗi lần chạy, khung nhìn 390 px — giá trị "trước" là 0,5217 / 0,3456 / 0,4193, nhiều khả năng vì dữ liệu kho đã bị các kịch bản chạy trước thay đổi (chưa phân tích kỹ); giá trị "sau" và chiều tăng không đổi.)

### 4.3 Kết quả và tỷ lệ chập chờn

Ba lần chạy độc lập (mỗi lần khởi động lại server, seed lại CSDL), mỗi lần `pnpm e2e --repeat-each=3`. Lần 1 chạy trước khi có `smoke` và `a11y`.

| Lần | Thời điểm bắt đầu | Tải 1 phút | Lượt thực thi | Đạt | Lỗi | Chập chờn |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 02:03 | không ghi | 19 | 19 | 0 | 0 |
| 2 | 02:30 | 3,3 | 34 | 34 | 0 | 0 |
| 3 | 02:33 | 4,0 | 34 | 34 | 0 | 0 |

Theo từng kịch bản (gộp 3 lần chạy):

| Kịch bản | Dự án | Lượt | Đạt | Lỗi | Trung vị | Lâu nhất |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| E2E-1 advisor-to-payment | desktop-1440 | 9 | 9 | 0 | 10,4 s | 10,7 s |
| E2E-1 advisor-to-payment | mobile-390 | 9 | 9 | 0 | 11,0 s | 11,5 s |
| E2E-2 customizer-conflict | desktop-1440 | 9 | 9 | 0 | 2,6 s | 2,6 s |
| E2E-2 customizer-conflict | mobile-390 | 9 | 9 | 0 | 2,6 s | 2,6 s |
| E2E-3 admin-weights | desktop-1440 | 9 | 9 | 0 | 0,7 s | 9,2 s |
| E2E-3 admin-weights | mobile-390 | 9 | 9 | 0 | 0,6 s | 9,1 s |
| E2E-4 a11y (2 test) | desktop-1440 | 12 | 12 | 0 | 0,4 s | 7,9 s |
| E2E-4 a11y (2 test) | mobile-390 | 12 | 12 | 0 | 0,4 s | 8,9 s |
| E2E-5 smoke | smoke | 6 | 6 | 0 | 7,4 s | 10,0 s |
| bước đăng nhập admin | setup | 3 | 3 | 0 | 4,6 s | 5,4 s |
| **Tổng** | | **87** | **87** | **0** | | |

Thời gian E2E-3 là 7,0–9,2 s ở lần chạy 1 nhưng 0,6–0,7 s ở lần 2 và 3 (cùng mã test, khác thứ tự thực thi; nguyên nhân chưa phân tích, mọi lượt đều đạt và đều ghi được số đo tỷ trọng GPU); E2E-4 gồm một test tải 6 trang (~7–9 s) và một test biểu mẫu (~0,4 s), nên trung vị thấp.

**Tỷ lệ chập chờn quan sát được: 0/87 = 0%.** Với 0 lỗi trên n lượt, cận trên 95% của tỷ lệ lỗi (quy tắc "ba trên n") là 3/87 ≈ 3,5% cho cả bộ và 3/18 ≈ 16,7% cho từng kịch bản cốt lõi; nghĩa là bộ test ổn định trong điều kiện đã thử, nhưng số lượt chưa đủ để khẳng định tỷ lệ chập chờn dưới 1%.

Ghi chú trung thực: trong lúc viết test có một số lần đỏ do chính kịch bản (bộ chọn khớp hai phần tử, giải mã sai luồng SSE). Các lỗi đó được sửa trước khi đo và không tính vào bảng trên.

## 5. Hiệu năng

### 5.1 Optimization Engine (trích dẫn)

> Nguồn: `packages/engine/bench/results.md`, sinh bởi `pnpm --filter @pc/engine bench` ngày 2026-11-07 (Apple M3, Node v22.20.0). Task QA không chạy lại bench; bảng dưới chép nguyên số liệu. Catalog tổng hợp từ PRNG có hạt giống cố định, 4 kịch bản (office 20M, gaming 25M, graphics 40M, ai 60M), giới hạn 2.000.000 nút. † = có lần chạm giới hạn nút (kết quả có thể không tối ưu).

| Catalog (còn hàng) | Biến thể | p50 ms | p95 ms | số nút TB | tối ưu |
| --- | --- | ---: | ---: | ---: | --- |
| 50 (47) | vét cạn | 38,4 | 57,09 | 1.581.865 | 12/12 |
| 50 (47) | backtracking | 3,09 | 5,87 | 35.315 | 12/12 |
| 50 (47) | + forward checking | 1,55 | 9,9 | 29.034 | 12/12 |
| 50 (47) | đầy đủ (AC-3 + FC + B&B) | 0,45 | 1,19 | 300 | 100/100 |
| 100 (87) | vét cạn | 48,39 | 76,37 | 2.000.000† | 0/12 |
| 100 (87) | backtracking | 127,12 | 184,15 | 1.757.769† | 6/12 |
| 100 (87) | + forward checking | 245,36 | 272,19 | 1.531.640† | 6/12 |
| 100 (87) | đầy đủ | 1,02 | 1,98 | 973 | 100/100 |
| 250 (221) | vét cạn | 44,56 | 52,42 | 2.000.000† | 0/12 |
| 250 (221) | backtracking | 171,2 | 193,89 | 2.000.000† | 0/12 |
| 250 (221) | + forward checking | 232,01 | 243,38 | 2.000.000† | 0/12 |
| **250 (221)** | **đầy đủ** | **6,77** | **11,5** | 8.937 | 100/100 |
| 500 (443) | vét cạn | 52,77 | 69,11 | 2.000.000† | 0/12 |
| 500 (443) | backtracking | 167,49 | 188,08 | 2.000.000† | 0/12 |
| 500 (443) | + forward checking | 228,83 | 260,32 | 2.000.000† | 0/12 |
| 500 (443) | đầy đủ | 10,84 | 40,29 | 16.775 | 100/100 |

Không gian vét cạn của kịch bản gaming 25M trên catalog 250 sản phẩm là 3,16·10¹¹ tổ hợp (≈ 2,1 giờ ở tốc độ đo được), trong khi bản đầy đủ duyệt trung bình 8.937 nút. NFR-01 (p95 < 300 ms trên ~250 sản phẩm) **đạt** ở mức Engine.

### 5.2 API `POST /api/recommendations` (autocannon)

Lệnh: `pnpm perf` (`apps/api/test/perf/recommendations.autocannon.ts`), API đã chạy ở cổng 4104 trên catalog seed 240 sản phẩm; 30 s mỗi kịch bản; tải 1 phút lúc bắt đầu 4,8.

- **Không cache:** mỗi yêu cầu có bộ (mục đích, ngân sách, sở thích) khác nhau — 4 mục đích, ngân sách 12–72 triệu bước 10.000 ₫ duyệt theo thứ tự rải đều, 5 biến thể sở thích — nên không yêu cầu nào trùng khóa cache; phiên bản catalog được tăng trước mỗi kịch bản để bộ nhớ đệm bắt đầu lạnh. Mỗi yêu cầu chạy đủ Engine và lưu tới 3 cấu hình vào CSDL.
- **Có cache:** một yêu cầu giống hệt (gaming 25 triệu) lặp lại.
- **Vượt giới hạn tần suất:** API giới hạn 20 gợi ý/phút cho mỗi khách (theo cookie `gid`, không có cookie thì theo IP). Mỗi yêu cầu của autocannon gửi một cookie `gid=perf<ngẫu nhiên>` khác nhau (`setupRequest`), nên mỗi yêu cầu là một "khách mới" và không bị 429 (đếm được 0 lần 429). Điều này cũng là một lỗ hổng, xem BUG-02.
- Độ trễ là thời gian phản hồi phía client của từng yêu cầu; phân vị tính theo hạng gần nhất trên toàn bộ mẫu (không qua histogram). Cột "Engine" là `stats.timeMs` bộ giải tự báo trong phản hồi.

| Kịch bản | Kết nối | Số yêu cầu | Yêu cầu/s | p50 ms | p95 ms | p99 ms | max ms | Engine p50 / p95 ms | Lỗi |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Không cache | 1 | 3.797 | 126,6 | 7,3 | 10,9 | 14,7 | 37,2 | 2,3 / 4,4 | 0 |
| Không cache | 10 | 6.848 | 228,3 | 43,4 | 52,2 | 57,4 | 73,1 | 2,3 / 4,3 | 0 |
| Có cache | 10 | 36.597 | 1.219,9 | 7,9 | 10,6 | 13,5 | 69,8 | (giá trị đã cache) | 0 |

Nhận xét:
- Mọi yêu cầu đều 200; 0 lỗi kết nối, 0 timeout. Ở kịch bản có cache: 10 MISS (10 kết nối đồng thời cùng trượt cache ở lần đầu, xem quan sát O-2) và 36.587 HIT.
- Với 1 kết nối, p95 toàn trình 10,9 ms, trong đó Engine chỉ chiếm p95 4,4 ms; phần còn lại là HTTP, Redis và ghi 3 cấu hình vào Postgres. Mục tiêu 300 ms của NFR-01 thỏa mãn cả ở mức API.
- Với 10 kết nối, thông lượng bão hòa quanh 228 yêu cầu/s trên **một** tiến trình Node; độ trễ tăng lên p50 43,4 ms chủ yếu do xếp hàng (10 / 228 ≈ 44 ms), không phải do Engine chậm đi.
- Cache cho thông lượng gấp ~5,3 lần (1.219,9 so với 228,3 yêu cầu/s) ở cùng 10 kết nối.
- Engine trên catalog seed thật (p95 4,4 ms) nhanh hơn trên catalog tổng hợp 250 sản phẩm của bench (p95 11,5 ms); hai bộ dữ liệu và tập kịch bản khác nhau nên không so trực tiếp.

### 5.3 Độ trễ một lượt chat qua SSE (chế độ dự phòng)

Lệnh: `apps/api/test/perf/chat-sse.latency.ts` (chạy trong `pnpm perf`). 20 lượt đầu tiên tuần tự với 20 câu khác nhau (gaming, đồ họa, AI, văn phòng), mỗi lượt một phiên và một cookie khách mới; cache gợi ý lạnh; đo từ lúc gửi `POST /chat/sessions/:id/messages` qua localhost; tải 1 phút 8,8.

| Mốc | p50 ms | p95 ms | max ms | TB ms |
| --- | ---: | ---: | ---: | ---: |
| byte đầu tiên (sự kiện `session`) | 5,5 | 9,8 | 23,3 | 6,7 |
| sự kiện `builds` đầu tiên | 14,4 | 19,5 | 50,6 | 16,3 |
| sự kiện `done` (hết lượt) | 17,8 | 23,2 | 56,2 | 19,6 |

20/20 lượt có cấu hình, cả 20 ở chế độ FALLBACK. Lượt chậm nhất (50,6 ms tới `builds`) là lượt đầu tiên, nhiều khả năng vì phải dựng lại catalog cho Engine sau khi phiên bản catalog vừa tăng. Với n = 20, p95 theo hạng gần nhất là giá trị lớn thứ hai.

**Giới hạn:** đây là chế độ dự phòng, không gọi Gemini. Với Gemini thật, độ trễ sẽ gồm thời gian mô hình (thường hàng giây) và phụ thuộc mạng/quota; NFR-02 (≤ 8 s) ở chế độ AI chưa được đo trong task này vì không có khóa API.

## 6. Đánh giá chất lượng AI (trích dẫn)

> Nguồn: `apps/api/eval/results.md`, sinh bởi `pnpm --filter @pc/api eval:ai` ngày 2026-11-07 ở **chế độ dự phòng** (không có `GEMINI_API_KEY`), 30 kịch bản của `golden-set.json`, tool và Engine thật trên CSDL dev, cache lạnh. Task QA không chạy lại.

| Chỉ số | Nghiêm ngặt (theo kỳ vọng của trợ lý AI) | Theo khả năng thiết kế của chế độ luật |
| --- | --- | --- |
| Gọi đúng tool | 86,7% (26/30) | 100% (30/30) |
| Tham số đúng (mục đích khớp, ngân sách lệch ≤ 5%) | 92,0% (23/25) | 100% (25/25) |
| Sở thích đúng (hãng, màu, độ phân giải, Wi-Fi, kích thước) | 90,0% (9/10) | 100% (10/10) |
| Hiện cấu hình đúng lúc | 100% (30/30) | 100% (30/30) |
| Cấu hình hợp lệ (kiểm lại bằng `checkCompatibility` + ngân sách) | 100% (69/69) | 100% (69/69) |
| Hỏi lại khi thiếu thông tin | 100% (3/3) | 100% (5/5) |
| Giải thích ngân sách không khả thi kèm mức tối thiểu | 100% (1/1) | 100% (1/1) |
| Đạt mọi tiêu chí | **86,7% (26/30)** | 100% (30/30) |
| Độ trễ một lượt p50 / p95 / max | 10 / 22 / 97 ms | 10 / 22 / 97 ms |

Bốn kịch bản trượt ở cột nghiêm ngặt (F01, F02, P01, P02) là các yêu cầu chỉnh sửa hội thoại ("rẻ hơn 3 triệu", "đổi sang card AMD") và hỏi sản phẩm cụ thể: chế độ luật được thiết kế để gợi ý lại thay vì `modify_build` và hỏi lại thay vì `search_products`. **Con số nên dẫn trong báo cáo là cột nghiêm ngặt: 26/30.**

**Hạn chế (giữ nguyên từ nguồn):** bộ golden set do người phát triển viết khi đã biết phạm vi NLU dự phòng và không mang tính đối kháng, nên 30/30 là **cận trên**, không phải độ chính xác trên câu hỏi thật; chỉ 30 kịch bản, một lần chạy, catalog ~240 sản phẩm, chưa đủ ý nghĩa thống kê; độ trễ là thời gian xử lý trong tiến trình, chưa gồm mạng và SSE (mục 5.3 bổ sung phần này); kết quả với Gemini thật chưa có.

Điểm quan trọng nhất cho anti-goal "AI không bịa linh kiện/giá": 69/69 cấu hình hợp lệ trong eval, và trong E2E-1 cả 3 cấu hình của mọi lượt chạy đều được kiểm lại bằng API tương thích của server và nằm trong ngân sách.

## 7. Kiểm thử đồng thời

Các test dưới đây là integration test trên Postgres và Redis thật (`apps/api`), đều đạt trong cả 4 lần chạy bộ API ở mục 8. Mỗi người mua là một agent Supertest có cookie `gid` và giỏ riêng; các yêu cầu được bắn song song bằng `Promise.all`.

| Tình huống | Test (tệp › tên) | Kỳ vọng được kiểm |
| --- | --- | --- |
| Bán vượt: tồn 1, 5 đơn cùng lúc | `orders/orders.concurrency.int.test.ts` › "5 parallel orders for a product with stock 1 → exactly one 201 and four 409 OUT_OF_STOCK" | đúng 1 đơn 201, 4 đơn 409; `reserved = 1`, `stock = 1` |
| Bán vượt: N đơn cho M < N chiếc | cùng tệp › "N parallel orders for M < N units → exactly M succeed and reserved never exceeds stock" | đúng M đơn thành công, `stock - reserved = 0` |
| Khóa chéo hai sản phẩm | cùng tệp › "orders locking the same two products in opposite cart order neither deadlock nor oversell" | chỉ có 201/409, không deadlock |
| Webhook trùng gửi song song | `payments/payments.webhook.int.test.ts` › "a duplicate webhook delivered in parallel pays once and stores one payment" | PAID một lần, một dòng `payments` |
| Webhook phát lại | cùng tệp › "is idempotent on provider_txn_id: a replayed webhook is a 200 no-op" | idempotent theo `provider_txn_id` |
| Hết hạn giữ hàng chạy đua với webhook | cùng tệp › "expiry racing a webhook always ends consistent: either paid once or released once" | mỗi đơn hoặc PAID đúng một lần hoặc được nhả đúng một lần |
| Bấm đặt hàng hai lần (khách) | `orders/orders.int.test.ts` › "a parallel double submit from one guest creates exactly one order" | đúng một đơn, `reserved` tăng một lần |
| Bấm đặt hàng hai lần (tài khoản) | cùng tệp › "a parallel double submit from one account creates exactly one order" | như trên |
| Thêm vào giỏ song song | `cart/cart.int.test.ts` › "parallel adds to a guest cart never lose an increment", "parallel adds to a user cart end in a single row with the summed quantity", "parallel adds cannot push a line past available stock (guest and user)" | không mất số lượng, không vượt tồn khả dụng |
| Job hết hạn | `jobs/order-expiry.int.test.ts` (4 test) | nhả `reserved`, chạy lại không nhả hai lần, đơn đã trả tiền không bị hủy |

Đối chứng (ghi trong graph node `T-INT-OVERSELL`, do task 6b thực hiện): khi tạm thay `UPDATE … WHERE stock - reserved >= q` bằng kiểu "SELECT kiểm tra rồi UPDATE", test đầu cho `[201, 201, 201, 201, 201]` (bán vượt 4 chiếc), chứng tỏ test phát hiện được race condition.

## 8. Điều tra test chập chờn ECONNRESET / "socket hang up"

**Bối cảnh:** trước đây Lead và task 7b thấy hiếm khi (0–2% số lần chạy, Lead thăm dò 0–6/300 yêu cầu đăng nhập) lỗi `Error: socket hang up` sau khoảng 2 s trong `auth.int.test.ts` ("is off in the test environment by default", "register → login…") và `recommendation.int.test.ts`, khi máy đang tải nặng (5 agent song song).

### 8.1 Đo lại trên CSDL riêng

| Phép thử | Điều kiện | Lượt | Lỗi |
| --- | --- | ---: | ---: |
| Cả bộ API (`pnpm --filter @pc/api test`) × 3, thêm 1 lần có reporter JSON | `pcbuilder_e2e` + Redis db 7, tải 1 phút 3,8–4,4 (đo ở 3 lần đầu) | 4 × 529 = 2.116 ca | 0 |
| `auth.int.test.ts` × 15 | thêm 16 tiến trình đốt CPU, tải 1 phút tăng dần 9,5 → 53,8 | 15 × 13 = 195 ca | 0 |
| Thăm dò `test/perf/supertest-reset.probe.ts`: 300 lần đăng nhập tuần tự × 3 biến thể | thêm 12 tiến trình đốt CPU, tải 1 phút lên tới 133 | 900 yêu cầu | 0 |
| Thăm dò như trên, không thêm tải | 200 × 3 biến thể | 600 yêu cầu | 0 |

Ba biến thể của tệp thăm dò: (a) `request(app)` — mỗi yêu cầu một server mới, agent toàn cục mặc định của Node (keep-alive); (b) như (a) nhưng `keepAlive: false`; (c) một server dùng chung cho cả loạt. Không biến thể nào lỗi.

**Kết luận: lỗi không tái hiện được trên CSDL và Redis riêng, kể cả khi tải CPU rất nặng. Nguyên nhân gốc chưa được xác nhận.**

### 8.2 Phân tích và giả thuyết

1. **Bản vá keep-alive chỉ phủ 12/19 tệp dùng Supertest.** `test/test-support.ts` đặt `http.globalAgent = new http.Agent({ keepAlive: false })`, nhưng Vitest cô lập module theo từng tệp, nên dòng này chỉ có hiệu lực ở các tệp import `test-support.ts`. Bảy tệp không import: `app.test.ts`, `auth.int.test.ts`, `builds.int.test.ts`, `catalog.int.test.ts`, `chat.int.test.ts`, `compatibility.int.test.ts`, `recommendation.int.test.ts` — **trùng đúng hai tệp từng báo lỗi**. Bằng chứng gián tiếp: log pino của các tệp đã vá cho thấy header `connection: close`; các tệp chưa vá chạy với keep-alive mặc định (Node 22: `keepAlive: true`, `timeout: 5000`). Tuy vậy, Lead ghi rằng thăm dò của Lead vẫn thấy reset khi đã `keepAlive=false`, nên keep-alive không giải thích được toàn bộ.
2. **Không phải do tái sử dụng cổng trên macOS.** macOS cấp cổng cho `listen(0)` tuần tự: 3.000 server liên tiếp nhận 3.000 cổng khác nhau, 2.997 cặp liền kề tăng đúng 1 (`port-reuse` trong scratchpad), nên kịch bản "socket keep-alive cũ trỏ tới cổng vừa được cấp lại cho server mới" gần như không xảy ra trong một tiến trình.
3. **Giả thuyết còn lại (môi trường, chưa kiểm chứng):** mỗi yêu cầu `request(app)` tiêu tốn 2 cổng tạm (server + client) trong dải dùng chung 49152–65535 (16.384 cổng), và kết nối đã đóng giữ trạng thái TIME_WAIT 30 s (`net.inet.tcp.msl` = 15 s). Khi 5 agent cùng chạy bộ test (mỗi bộ hàng nghìn yêu cầu), dải cổng có thể quay vòng trong vài phút và va chạm với kết nối cũ của tiến trình khác. Điều này khớp với việc tỷ lệ lỗi dao động theo số agent chạy song song, còn tải CPU đơn thuần (phép thử 8.1) thì không gây lỗi.
4. **bcrypt chặn CPU:** đăng nhập chậm hơn (bcryptjs cost 10) nên là nơi lộ lỗi nhiều nhất, nhưng thăm dò 900 lần đăng nhập dưới tải 133 không lỗi, nên bcrypt tự nó không phải nguyên nhân.

### 8.3 Đề xuất (chưa áp dụng, vì không tái hiện được)

Không thêm retry (sẽ che lỗi). Sửa tối thiểu, chỉ trong harness `apps/api/test`, không đụng code ứng dụng:

```diff
--- a/apps/api/test/setup-env.ts
+++ b/apps/api/test/setup-env.ts
+import http from 'node:http';
+
+// One connection per request in every test file, not only those importing test-support.ts.
+http.globalAgent = new http.Agent({ keepAlive: false });
 process.env.NODE_ENV = 'test';
--- a/apps/api/test/test-support.ts
+++ b/apps/api/test/test-support.ts
-http.globalAgent = new http.Agent({ keepAlive: false });
```

`setup-env.ts` đã là `setupFiles` của Vitest nên chạy trước mỗi tệp test, đưa cả 19 tệp về cùng một điều kiện. Nếu lỗi vẫn xuất hiện, bước tiếp theo là giảm số cổng tiêu tốn: khởi động một server cho mỗi tệp (`server = app.listen(0, '127.0.0.1')` trong `beforeAll`, `request(server)`), như biến thể (c) của tệp thăm dò; và khi lỗi xảy ra thì ghi lại `NODE_DEBUG=net,http` cùng số kết nối TIME_WAIT (`netstat -an | grep -c TIME_WAIT`) để xác nhận giả thuyết 3.

## 9. Vấn đề đã biết và danh sách BUG

| Mã | Mức | Mô tả | Tái hiện | Đề xuất |
| --- | --- | --- | --- | --- |
| **BUG-02** | Trung bình (bảo mật / chống lạm dụng) | Giới hạn tần suất theo khách bị vượt qua bằng cách đổi cookie `gid`. `POST /recommendations` (20/phút) và tạo phiên chat (10/phút) đếm theo `gid` nếu cookie hợp lệ, chỉ đếm theo IP khi **không** có cookie. Client tự sinh `gid` ngẫu nhiên cho mỗi yêu cầu là không bao giờ bị chặn. Mỗi yêu cầu gợi ý trượt cache còn ghi 3 dòng `builds`, nên có thể làm phình CSDL. | Chính phép đo 5.2: 10.645 yêu cầu gợi ý trượt cache trong 60 s từ một IP, 0 lần 429, mỗi yêu cầu lưu tới 3 dòng `builds` (tới ~31.900 dòng); phép đo 5.3 tạo 20 phiên chat trong < 1 s, đều 201. Lặp tay (đã chạy lại ngày 2026-11-08): `for i in $(seq 1 30); do curl -s -o /dev/null -w '%{http_code} ' -b "gid=abuse$(openssl rand -hex 8)" -H 'content-type: application/json' -d '{"budget":25000000,"purpose":"gaming"}' http://localhost:4104/api/recommendations; done` → 30 lần 200; cùng lệnh với một cookie cố định → 20 lần 200 rồi 429. Tạo phiên chat (`POST /api/chat/sessions`, body `{}`) 12 lần với cookie đổi mỗi lần → 12 lần 201; với cookie cố định → lần 11 và 12 bị 429. | Thêm một trần theo IP đặt chồng lên giới hạn theo `gid` (ví dụ 120 yêu cầu/phút/IP) cho gợi ý và tạo phiên chat. Sửa ở code ứng dụng, chuyển Lead. |
| **BUG-01** | Thấp (khả năng truy cập) | Các trang quản trị không có thẻ tiêu đề: tiêu đề trang ("Trọng số thuật toán", …) được `AdminShell` hiển thị trong một `div` của thanh trên, nên không có `h1`, trình đọc màn hình không điều hướng theo tiêu đề được (WCAG 1.3.1). | Đăng nhập admin → `/admin/weights` → trong cây truy cập chỉ có `banner: Trọng số thuật toán`, `getByRole('heading', { level: 1 })` không tìm thấy phần tử nào. | Đổi phần tử tiêu đề trong `apps/web/src/components/layout/AdminShell.tsx` thành `h1`. Sau khi sửa có thể mở rộng `e2e/a11y.spec.ts` sang trang admin. |
| O-1 | Quan sát | `Content-Type` của luồng SSE là `text/event-stream` không kèm `charset`. Trình duyệt và client của web (`fetch` + `TextDecoder`) giải mã UTF-8 đúng theo chuẩn, nhưng công cụ đọc nguyên thân phản hồi qua Chromium DevTools (Playwright `response.text()`) nhận chuỗi bị giải mã kiểu windows-1252. | E2E-1 chỉ đọc trường ASCII từ luồng SSE vì lý do này. | Có thể thêm `; charset=utf-8` (vô hại). Không ảnh hưởng người dùng. |
| O-2 | Quan sát (hiệu năng) | Không có cơ chế "single-flight" khi lấp cache gợi ý: 10 yêu cầu giống nhau đến cùng lúc đều trượt cache, đều chạy Engine và mỗi yêu cầu lưu 3 cấu hình (kịch bản "có cache": 10 MISS). | Mục 5.2. | Chấp nhận được ở quy mô đồ án; nếu cần có thể khóa theo khóa cache trong Redis. |
| O-3 | Quan sát | `next start` cảnh báo không hợp với `output: 'standalone'`; E2E vẫn chạy được bằng `next start`, còn bản triển khai Docker dùng server standalone. | Log webServer của Playwright. | Không cần sửa. |
| O-4 | Hạn chế đo | Độ phủ API chưa đo (thiếu `@vitest/coverage-v8` ở `@pc/api`); không đo tương phản màu tự động; smoke test chưa chạy trên máy chủ đám mây thật; chế độ Gemini chưa được đo hiệu năng và chất lượng; UAT/SUS chưa làm. | — | Bổ sung khi có điều kiện (khóa Gemini, máy chủ triển khai, người khảo sát). |

Ngoài ra, mục 8 ghi nhận test chập chờn ECONNRESET của harness API là **không tái hiện được**; đây không phải lỗi sản phẩm đã xác nhận.

## 10. Ma trận truy vết yêu cầu → kiểm thử

Sinh từ Spec-Code Graph (`docs/graph/nodes`): cột "Test node trực tiếp" là các node test có `verifies` trỏ thẳng vào yêu cầu; cột "Gián tiếp" là node test kiểm chứng tính năng/use case hiện thực yêu cầu đó. Mã node tra ở `docs/graph/nodes/tests/`.

| Yêu cầu | Tên | Tính năng hiện thực | Test node trực tiếp | Gián tiếp / tệp test của tính năng |
| --- | --- | --- | --- | --- |
| FR-01 | Duyệt danh mục, lọc thông số động | F-CATALOG | T-INT-CATALOG | `catalog/**/*.test.ts` |
| FR-02 | Chi tiết sản phẩm, thông số, benchmark | F-CATALOG | T-INT-CATALOG | `catalog/**/*.test.ts` |
| FR-03 | Đăng ký, đăng nhập, phân quyền | F-AUTH | T-INT-AUTH, T-E2E-ADMIN-WEIGHTS | |
| FR-04 | Giỏ hàng khách vãng lai và tài khoản | F-CART | T-INT-ORDER-PAYMENT, T-E2E-CHAT-CHECKOUT | |
| FR-05 | Đặt hàng lẻ và lắp ráp nguyên bộ | F-ORDER, F-INVENTORY-LOCK | T-API-ORDER-STATE, T-INT-ORDER-PAYMENT, T-E2E-CHAT-CHECKOUT | T-INT-OVERSELL |
| FR-06 | Thanh toán VietQR, tự xác nhận | F-PAYMENT-VIETQR | T-API-VIETQR, T-INT-ORDER-PAYMENT, T-E2E-CHAT-CHECKOUT | |
| FR-07 | AI PC Advisor tiếng Việt | F-AI-ADVISOR | T-AI-GOLDEN, T-INT-CHAT, T-E2E-CHAT-CHECKOUT | T-PERF-ENGINE |
| FR-08 | Gợi ý 2–3 cấu hình tối ưu | F-ENGINE-CORE, F-RECOMMEND | T-ENGINE-SOLVER, T-INT-RECO | T-PERF-ENGINE |
| FR-09 | Customizer kiểm tra tương thích thời gian thực | F-CUSTOMIZER, F-COMPAT-CHECK, F-ENGINE-CORE | T-E2E-CUSTOMIZER | T-ENGINE-RULES, T-ENGINE-SOLVER |
| FR-10 | Lưu và chia sẻ cấu hình | F-BUILD-SHARE | — | `builds/**/*.test.ts` (13 ca: `builds.int.test.ts`, `builds.mapper.test.ts`) |
| FR-11 | Xuất báo giá PDF | F-QUOTE-PDF | — | `quotes/**/*.test.ts` (4 ca: `quotes.int.test.ts`) |
| FR-12 | Quản trị sản phẩm, form schema động | F-ADMIN-PRODUCTS | T-API-SPECSCHEMA, T-INT-ADMIN | |
| FR-13 | Quản trị tồn kho, benchmark | F-ADMIN-INVENTORY | T-INT-ADMIN | |
| FR-14 | Ma trận trọng số, ưu tiên thương mại | F-ADMIN-WEIGHTS | T-ENGINE-SCORING, T-INT-ADMIN, T-E2E-ADMIN-WEIGHTS | |
| FR-15 | Quản trị đơn hàng, vòng đời đơn | F-ADMIN-ORDERS | T-API-ORDER-STATE, T-INT-ADMIN | |
| FR-16 | Thống kê doanh thu, đối soát | F-ADMIN-STATS | T-INT-ADMIN | |
| FR-17 | Chế độ dự phòng của chatbot | F-FALLBACK-NLU, F-AI-ADVISOR | T-API-NLU, T-INT-CHAT | T-AI-GOLDEN, T-E2E-CHAT-CHECKOUT, T-PERF-ENGINE |
| FR-18 | Chống bán vượt khi đặt đồng thời | F-INVENTORY-LOCK, F-ORDER | T-INT-OVERSELL | T-API-ORDER-STATE, T-INT-ORDER-PAYMENT, T-E2E-CHAT-CHECKOUT |
| NFR-01 | Engine p95 < 300 ms (~250 sp) | F-ENGINE-CORE, F-RECOMMEND | T-ENGINE-BENCH, T-PERF-ENGINE | T-ENGINE-SOLVER, T-INT-RECO |
| NFR-02 | Chat ra 3 cấu hình ≤ 8 s | F-AI-ADVISOR | T-AI-GOLDEN, T-PERF-ENGINE | T-INT-CHAT |
| NFR-03 | Bảo mật, xác thực | F-AUTH | T-INT-AUTH | T-API-HEALTH |
| NFR-04 | Không phụ thuộc cứng dịch vụ AI | F-FALLBACK-NLU | T-API-NLU | |
| NFR-05 | AI không bịa linh kiện/giá | F-AI-ADVISOR | T-AI-GOLDEN, T-INT-CHAT, T-INT-RECO, T-E2E-CHAT-CHECKOUT | |
| NFR-06 | Tiếng Việt, responsive, WCAG AA | F-UI-DESIGN-SYSTEM | T-E2E-A11Y | (chưa đo tương phản) |
| NFR-07 | Đóng gói Docker, triển khai | F-DEPLOY | T-DEPLOY-SMOKE | (mới chạy cục bộ) |
| NFR-08 | Engine ≥ 90% branch coverage | F-ENGINE-CORE | T-ENGINE-RULES, T-ENGINE-SOLVER | |
| NFR-09 | Truy vết yêu cầu → code → test | F-SPEC-GRAPH | T-GRAPH-CLI | |
| NFR-10 | Tiền tệ số nguyên VND, định dạng vi-VN | — | T-API-SPECSCHEMA | |
| NFR-11 | UAT, điểm SUS | F-UAT-SURVEY | T-UAT-SUS | (chưa thực hiện) |

Mọi FR-01…FR-18 đều có ít nhất một tệp test tự động; FR-10 và FR-11 chưa có node test riêng mà được kiểm qua glob test của tính năng. `pnpm graph:check`: 0 lỗi.

## 11. Chạy lại

```bash
# CSDL riêng cho QA (một lần)
docker exec pcbuilder-postgres-1 psql -U pc -d pcbuilder -c "CREATE DATABASE pcbuilder_e2e OWNER pc;"

pnpm --filter @pc/engine test -- --coverage          # unit Engine + độ phủ
DATABASE_URL_TEST=postgres://pc:pc@localhost:5433/pcbuilder_e2e REDIS_URL_TEST=redis://localhost:6380/7 \
  pnpm --filter @pc/api test                          # unit + integration API
pnpm --filter @pc/web test                            # unit Web
pnpm e2e                                              # E2E (tự khởi động API 4104 + web 3104, seed lại CSDL)
pnpm e2e --repeat-each=3                              # đo chập chờn

# Hiệu năng: khởi động API trước (từ apps/api), rồi
PORT=4104 NODE_ENV=development DATABASE_URL=postgres://pc:pc@localhost:5433/pcbuilder_e2e \
  REDIS_URL=redis://localhost:6380/7 GEMINI_API_KEY= pnpm exec tsx ../../e2e/scripts/start-api.mts
pnpm perf                                             # autocannon 3×30 s + 20 lượt chat SSE

# Smoke test cho máy chủ đã triển khai
E2E_BASE_URL=https://<host> E2E_API_URL=https://<host>/api pnpm e2e --project=smoke
```

Kết quả gốc: `apps/api/test/perf/results.md`, `apps/api/test/perf/chat-sse-results.md`, `packages/engine/bench/results.md`, `apps/api/eval/results.md`; báo cáo HTML của Playwright ở `e2e/playwright-report/` (không đưa vào git).
