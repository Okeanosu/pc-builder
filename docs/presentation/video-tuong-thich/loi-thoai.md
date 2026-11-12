# Lời thoại: tương thích linh kiện và cơ sở dữ liệu

Video `pc-builder-tuong-thich.mp4`, 3:56, giọng neural nam NamMinh. Mốc thời gian lấy từ bản dựng.

## 0:00 · s01-title (slide `title`)

- `00:00` Phần này giải thích cách PC Builder kiểm tra một bộ máy có lắp được hay không, và cách dữ liệu được tổ chức trong cơ sở dữ liệu.

## 0:07 · s02-problem (slide `problem`)

- `00:07` Cửa hàng hiện có 240 sản phẩm thuộc 8 danh mục. Ghép mỗi danh mục một món cho ra hơn 626 tỷ tổ hợp.
- `00:15` Phần lớn trong số đó không lắp được. Chưa đến một phần ba số cặp CPU và mainboard khớp socket với nhau.
- `00:22` Vì vậy hệ thống phải tự kiểm tra, và giải thích lỗi để người mua hiểu.

## 0:26 · s03-data (slide `data`)

- `00:27` Mỗi danh mục có bộ thông số riêng. CPU có socket và TDP, vỏ case có chiều dài card tối đa, nguồn có công suất.
- `00:35` Thay vì tạo nhiều bảng, thông số được lưu trong một cột JSONB của bảng sản phẩm.
- `00:40` Danh sách trường của từng danh mục nằm trong cột spec_schema của bảng danh mục.

## 0:44 · s04-admin (ảnh chụp `admin-schema`)

- `00:45` Từ lược đồ này, trang quản trị tự sinh biểu mẫu nhập sản phẩm và bộ lọc ngoài cửa hàng.
- `00:49` Khóa nào bộ luật tương thích đang dùng thì bị khóa lại, quản trị viên không thể đổi tên hay xóa nhầm.
- `00:55` Khi lưu, thông số phải qua hai lớp kiểm tra: lược đồ trong cơ sở dữ liệu, và schema có kiểu trong code.

## 1:01 · s05-rules (slide `rules`)

- `01:02` Tính tương thích được kiểm tra bằng 15 luật, mã từ C01 đến C15.
- `01:06` Luật cứng báo lỗi: sai socket, sai chuẩn RAM, card dài hơn vỏ case, nguồn không đủ công suất.
- `01:12` Luật mềm chỉ cảnh báo: tản nhiệt hơi yếu, CPU và card đồ họa lệch cấp, hay chưa dùng hết ngân sách.

## 1:19 · s06-graph (slide `graph`)

- `01:19` Coi mỗi danh mục là một biến, các luật nối chúng thành một đồ thị ràng buộc.
- `01:23` CPU, mainboard và vỏ case nối với nhiều linh kiện nhất. Riêng luật công suất nguồn liên quan cùng lúc ba món: CPU, card đồ họa và nguồn.

## 1:33 · s07-psu (slide `psu`)

- `01:34` Ví dụ với Ryzen 7 7800X3D và RTX 4090: công suất ước tính là 120 W cộng 450 W cộng 75 W, bằng 645 W.
- `01:44` Nguồn phải đạt ít nhất 1,3 lần, tức 839 W, nếu không là lỗi. Dưới 1,5 lần, tức 968 W, hệ thống cảnh báo nguồn hơi sát tải.

## 1:55 · s08-builder (ảnh chụp `builder-conflict`)

- `01:56` Đây là một cấu hình cố ý chọn sai sáu chỗ trong Customizer.
- `01:59` Luật chạy ngay trên trình duyệt, không cần chờ server. Mỗi linh kiện hiện lỗi của mình, kèm mã luật và số liệu cụ thể.
- `02:07` Khung tổng quan đếm sáu xung đột, và vạch công suất 645 W trên nguồn 450 W chuyển sang màu đỏ.

## 2:14 · s09-picker (ảnh chụp `picker-dim`)

- `02:14` Khi chọn linh kiện, từng ứng viên được thử trước. Đã chọn CPU socket AM5, nên các mainboard LGA1700 bị làm mờ, kèm lý do.
- `02:25` Mainboard AM5 được đánh dấu tương thích với cấu hình hiện tại.

## 2:29 · s10-three (slide `three`)

- `02:30` Cùng một bộ luật viết bằng TypeScript chạy ở ba nơi.
- `02:33` Trên trình duyệt để phản hồi tức thì. Ở API, nơi lỗi cứng bị từ chối khi lưu cấu hình. Và trong Optimization Engine khi gợi ý cấu hình.
- `02:43` Nhờ vậy, kết quả khách thấy luôn trùng với kết quả server chấp nhận.

## 2:47 · s11-engine (slide `engine`)

- `02:47` Trong Engine, mỗi cặp luật hai ngôi được tính sẵn thành bảng tra, nên mỗi lần kiểm tra chỉ là một phép đọc mảng.
- `02:53` Mỗi khi gán một linh kiện, forward checking loại ngay những món không còn tương thích ở các danh mục chưa chọn.
- `02:59` Với nhu cầu chơi game 25 triệu, Engine xét 1.883 nút, loại 13.542 giá trị, và trả kết quả trong khoảng 15 mili giây.

## 3:09 · s12-db (slide `db`)

- `03:09` Toàn bộ dữ liệu nằm trong PostgreSQL, gồm 15 bảng chia thành 7 nhóm.
- `03:13` Sản phẩm; kho và hiệu năng; cấu hình PC; tài khoản; giỏ hàng; đơn hàng và thanh toán; và trợ lý AI.
- `03:21` Tiền lưu bằng số nguyên theo đồng. Tồn kho có thêm cột giữ hàng cho đơn chờ thanh toán. Sản phẩm không bị xóa, chỉ ẩn đi.

## 3:30 · s13-erd (ảnh chụp `erd`)

- `03:31` Sơ đồ quan hệ thực thể cho thấy 19 khóa ngoại nối các bảng với nhau.
- `03:35` Bảng cấu hình lưu lại linh kiện, cảnh báo và công suất tại thời điểm tạo, nên trang chia sẻ luôn hiển thị đúng kết luận đã đưa ra.
- `03:42` Đơn hàng cũng chụp lại tên và giá từng món lúc mua, nên đổi giá về sau không làm sai đơn cũ.

## 3:47 · s14-end (slide `end`)

- `03:48` Đó là cách PC Builder bảo đảm mọi bộ máy được gợi ý đều lắp được, đủ điện và vừa ngân sách.
- `03:53` Cảm ơn thầy cô và các bạn đã theo dõi.
