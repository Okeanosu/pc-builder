# Lời thoại video giới thiệu PC Builder

Video 5:36, 18 cảnh. Mỗi cảnh ghi mốc bắt đầu, độ dài và lời thoại (đúng chữ hiển thị trên phụ đề).
Muốn thu giọng thật: đọc theo từng cảnh, giữ gần đúng độ dài, rồi thay âm thanh khi dựng lại bằng `build.py`.

## 0:00 · s01-title (12 giây, hình: title)

- PC Builder.
- Hệ thống thương mại điện tử linh kiện máy tính, tích hợp trợ lý AI gợi ý cấu hình PC phù hợp nhu cầu người dùng.

## 0:11 · s02-problem (26 giây, hình: problem)

- Lắp một bộ máy tính không hề đơn giản.
- Người mua phải chọn đủ 8 linh kiện, từ CPU, mainboard, RAM đến card đồ họa, nguồn và vỏ case.
- Chỉ cần sai socket, sai chuẩn RAM hay nguồn không đủ công suất là cả bộ máy không chạy.
- Trong khi đó, phần lớn người mua chỉ biết mình muốn chơi game hay làm đồ họa, và có bao nhiêu tiền.

## 0:37 · s03-home (25 giây, hình: home)

- PC Builder giải quyết bài toán đó: người dùng chỉ cần kể nhu cầu bằng tiếng Việt.
- Ngay trên trang chủ là kết quả thật của bộ máy tối ưu: chơi game 25 triệu, 8 linh kiện có sẵn trong kho, tổng giá vừa khít ngân sách.
- Hệ thống cho biết đã xét gần 2.000 phương án chỉ trong vài mili giây.

## 1:02 · s04-advisor (30 giây, hình: advisor)

- Tại trang tư vấn, khách trò chuyện với trợ lý AI.
- Chỉ một câu “chơi game 25 triệu”, trợ lý trả về 3 cấu hình: tối ưu hiệu năng, cân bằng và tiết kiệm.
- Mỗi cấu hình là một bảng linh kiện: giá từng món, thanh phân bổ ngân sách 8 màu, điểm hiệu năng và trạng thái tương thích.
- Khách có thể nhắn tiếp “rẻ hơn 3 triệu” hay “đổi sang card AMD” để chỉnh cấu hình.

## 1:33 · s05-builder (21 giây, hình: builder)

- Người dùng muốn tự chọn thì dùng trang Tự build PC.
- Mỗi linh kiện được kiểm tra ngay với 15 luật tương thích, báo xung đột kèm lý do, ước tính công suất và gợi ý nguồn.
- Cấu hình có thể lưu, chia sẻ, xuất báo giá PDF hoặc thêm cả bộ vào giỏ.

## 1:54 · s06-catalog (9 giây, hình: category)

- Cửa hàng có đầy đủ danh mục và bộ lọc theo thông số kỹ thuật: socket, chuẩn RAM, dung lượng…

## 2:02 · s07-product (6 giây, hình: product)

- Trang chi tiết hiển thị bảng thông số và điểm hiệu năng benchmark.

## 2:08 · s08-cart (6 giây, hình: cart)

- Khi đặt hàng, khách chọn mua lẻ hoặc đặt lắp ráp nguyên bộ.

## 2:14 · s09-pay (19 giây, hình: pay)

- Thanh toán bằng mã VietQR động: số tiền và nội dung chuyển khoản đã điền sẵn.
- Ngân hàng báo về qua webhook, đơn được xác nhận tự động trong vài giây.
- Hàng được giữ 15 phút, và hệ thống bảo đảm không bao giờ bán quá số hàng còn trong kho.

## 2:33 · s10-admin (12 giây, hình: admin)

- Người quản trị có tổng quan doanh thu, quản lý sản phẩm, tồn kho, đơn hàng, đối soát chuyển khoản và xem lại từng hội thoại AI.

## 2:45 · s11-weights (9 giây, hình: weights)

- Trọng số của thuật toán theo từng mục đích sử dụng có thể chỉnh trực tiếp, và gợi ý mới thay đổi ngay.

## 2:54 · s12-arch (22 giây, hình: arch)

- Về kỹ thuật: giao diện Next.js, máy chủ API Node.js, cơ sở dữ liệu PostgreSQL với thông số linh kiện lưu dạng JSONB.
- Redis làm bộ nhớ đệm, và mô hình Gemini của Google.
- Tất cả đóng gói bằng Docker và chạy trên một máy chủ ảo (VPS).

## 3:16 · s13-calling (30 giây, hình: calling)

- Điểm then chốt là cách trợ lý AI hoạt động: Gemini không tự biết gì về kho hàng.
- Mỗi lần gọi, máy chủ gửi kèm mô tả 5 công cụ.
- Khi cần dữ liệu, Gemini trả về một yêu cầu gọi công cụ, ví dụ recommend_builds với ngân sách 25 triệu.
- Máy chủ chạy công cụ trên dữ liệu thật, gửi kết quả lại, rồi Gemini mới viết lời giải thích. Kỹ thuật này gọi là function calling.

## 3:46 · s14-guard (20 giây, hình: guard)

- Để trợ lý không bịa: mô hình ngôn ngữ chỉ điều phối, bộ máy tối ưu quyết định linh kiện.
- Bảng cấu hình hiển thị cho khách lấy trực tiếp từ dữ liệu, không qua lời của mô hình.
- Sau mỗi lượt, máy chủ đối chiếu mọi số tiền mô hình viết ra với số liệu thật.

## 4:07 · s15-engine (35 giây, hình: engine)

- Trái tim của hệ thống là Optimization Engine: bài toán thỏa mãn ràng buộc (CSP) kết hợp bài toán ba lô nhiều lựa chọn (MCKP).
- Engine dùng AC-3 loại trước linh kiện không thể ghép, quay lui có Forward Checking, và Branch & Bound với cận trên từ MCKP nới lỏng.
- Với 250 sản phẩm, engine giải trong khoảng 11 mili giây, trong khi vét cạn không chạy xong.
- Trên 1.512 trường hợp kiểm chứng, kết quả trùng khớp hoàn toàn với vét cạn.

## 4:42 · s16-fallback (23 giây, hình: fallback)

- Gemini dùng gói miễn phí nên có lúc hết lượt hoặc chậm.
- Khi đó hệ thống tự chuyển sang chế độ dự phòng: bộ phân tích tiếng Việt theo luật, hiểu “25 củ” hay “rẻ hơn 3 triệu”.
- Bộ phân tích này vẫn gọi cùng engine tối ưu, nên người dùng luôn nhận được câu trả lời.

## 5:04 · s17-quality (21 giây, hình: quality)

- Hơn 1.000 bài kiểm thử tự động, 12 kịch bản kiểm thử đầu cuối trên máy tính và điện thoại, bộ đánh giá AI 30 kịch bản.
- Đặc tả, mã nguồn và kiểm thử được liên kết thành một đồ thị truy vết, phục vụ viết báo cáo.

## 5:25 · s18-end (10 giây, hình: end)

- PC Builder: nói nhu cầu, nhận cấu hình đúng ngân sách, từ hàng có sẵn trong kho.
- Cảm ơn mọi người đã theo dõi.
