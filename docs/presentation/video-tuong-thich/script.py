# Video 2: product compatibility and the database. Each line is (say, cap); with the neural voice the caption is
# spoken after SPEECH_FIXES, so `say` only matters for the macOS fallback voice. Motion (x, y, s) is the visible
# window as fractions of the image: top-left corner and size.

# Spoken forms for names and units in this video (checked before the defaults in build.py).
SPEECH_FIXES = [
    ('C01 đến C15', 'C 01 đến C 15'), ('7800X3D', '7800 X 3 D'), ('RTX 4090', 'RTX 40 90'),
    ('spec_schema', 'spec schema'), ('LGA1700', 'L G A 1700'), ('AM5', 'A M 5'),
    ('1.883', '1883'), ('13.542', '13542'),
    ('120 W', '120 oát'), ('450 W', '450 oát'), ('75 W', '75 oát'), ('645 W', '645 oát'),
    ('839 W', '839 oát'), ('968 W', '968 oát'),
]

SLIDE = [(0, 0, 1), (0.02, 0.02, 0.96)]


def lines(*caps):
    return [(c, c) for c in caps]


SCENES = [
    {"id": "s01-title", "visual": "slide:title", "motion": [(0, 0, 1), (0.03, 0.03, 0.94)], "lines": lines(
        "Phần này giải thích cách PC Builder kiểm tra một bộ máy có lắp được hay không, và cách dữ liệu được tổ chức trong cơ sở dữ liệu.",
    )},
    {"id": "s02-problem", "visual": "slide:problem", "motion": SLIDE, "lines": lines(
        "Cửa hàng hiện có 240 sản phẩm thuộc 8 danh mục. Ghép mỗi danh mục một món cho ra hơn 626 tỷ tổ hợp.",
        "Phần lớn trong số đó không lắp được. Chưa đến một phần ba số cặp CPU và mainboard khớp socket với nhau.",
        "Vì vậy hệ thống phải tự kiểm tra, và giải thích lỗi để người mua hiểu.",
    )},
    {"id": "s03-data", "visual": "slide:data", "motion": SLIDE, "lines": lines(
        "Mỗi danh mục có bộ thông số riêng. CPU có socket và TDP, vỏ case có chiều dài card tối đa, nguồn có công suất.",
        "Thay vì tạo nhiều bảng, thông số được lưu trong một cột JSONB của bảng sản phẩm.",
        "Danh sách trường của từng danh mục nằm trong cột spec_schema của bảng danh mục.",
    )},
    {"id": "s04-admin", "visual": "shot:admin-schema", "motion": [(0, 0, 1), (0.12, 0.2, 0.62)], "lines": lines(
        "Từ lược đồ này, trang quản trị tự sinh biểu mẫu nhập sản phẩm và bộ lọc ngoài cửa hàng.",
        "Khóa nào bộ luật tương thích đang dùng thì bị khóa lại, quản trị viên không thể đổi tên hay xóa nhầm.",
        "Khi lưu, thông số phải qua hai lớp kiểm tra: lược đồ trong cơ sở dữ liệu, và schema có kiểu trong code.",
    )},
    {"id": "s05-rules", "visual": "slide:rules", "motion": SLIDE, "lines": lines(
        "Tính tương thích được kiểm tra bằng 15 luật, mã từ C01 đến C15.",
        "Luật cứng báo lỗi: sai socket, sai chuẩn RAM, card dài hơn vỏ case, nguồn không đủ công suất.",
        "Luật mềm chỉ cảnh báo: tản nhiệt hơi yếu, CPU và card đồ họa lệch cấp, hay chưa dùng hết ngân sách.",
    )},
    {"id": "s06-graph", "visual": "slide:graph", "motion": [(0, 0, 1), (0.03, 0.1, 0.85)], "lines": lines(
        "Coi mỗi danh mục là một biến, các luật nối chúng thành một đồ thị ràng buộc.",
        "CPU, mainboard và vỏ case nối với nhiều linh kiện nhất. Riêng luật công suất nguồn liên quan cùng lúc ba món: CPU, card đồ họa và nguồn.",
    )},
    {"id": "s07-psu", "visual": "slide:psu", "motion": SLIDE, "lines": lines(
        "Ví dụ với Ryzen 7 7800X3D và RTX 4090: công suất ước tính là 120 W cộng 450 W cộng 75 W, bằng 645 W.",
        "Nguồn phải đạt ít nhất 1,3 lần, tức 839 W, nếu không là lỗi. Dưới 1,5 lần, tức 968 W, hệ thống cảnh báo nguồn hơi sát tải.",
    )},
    {"id": "s08-builder", "visual": "shot:builder-conflict", "motion": [(0, 0, 1), (0.2, 0.22, 0.62)], "lines": lines(
        "Đây là một cấu hình cố ý chọn sai sáu chỗ trong Customizer.",
        "Luật chạy ngay trên trình duyệt, không cần chờ server. Mỗi linh kiện hiện lỗi của mình, kèm mã luật và số liệu cụ thể.",
        "Khung tổng quan đếm sáu xung đột, và vạch công suất 645 W trên nguồn 450 W chuyển sang màu đỏ.",
    )},
    {"id": "s09-picker", "visual": "shot:picker-dim", "motion": [(0, 0, 1), (0.4, 0.12, 0.6)], "lines": lines(
        "Khi chọn linh kiện, từng ứng viên được thử trước. Đã chọn CPU socket AM5, nên các mainboard LGA1700 bị làm mờ, kèm lý do.",
        "Mainboard AM5 được đánh dấu tương thích với cấu hình hiện tại.",
    )},
    {"id": "s10-three", "visual": "slide:three", "motion": SLIDE, "lines": lines(
        "Cùng một bộ luật viết bằng TypeScript chạy ở ba nơi.",
        "Trên trình duyệt để phản hồi tức thì. Ở API, nơi lỗi cứng bị từ chối khi lưu cấu hình. Và trong Optimization Engine khi gợi ý cấu hình.",
        "Nhờ vậy, kết quả khách thấy luôn trùng với kết quả server chấp nhận.",
    )},
    {"id": "s11-engine", "visual": "slide:engine", "motion": SLIDE, "lines": lines(
        "Trong Engine, mỗi cặp luật hai ngôi được tính sẵn thành bảng tra, nên mỗi lần kiểm tra chỉ là một phép đọc mảng.",
        "Mỗi khi gán một linh kiện, forward checking loại ngay những món không còn tương thích ở các danh mục chưa chọn.",
        "Với nhu cầu chơi game 25 triệu, Engine xét 1.883 nút, loại 13.542 giá trị, và trả kết quả trong khoảng 15 mili giây.",
    )},
    {"id": "s12-db", "visual": "slide:db", "motion": SLIDE, "lines": lines(
        "Toàn bộ dữ liệu nằm trong PostgreSQL, gồm 15 bảng chia thành 7 nhóm.",
        "Sản phẩm; kho và hiệu năng; cấu hình PC; tài khoản; giỏ hàng; đơn hàng và thanh toán; và trợ lý AI.",
        "Tiền lưu bằng số nguyên theo đồng. Tồn kho có thêm cột giữ hàng cho đơn chờ thanh toán. Sản phẩm không bị xóa, chỉ ẩn đi.",
    )},
    {"id": "s13-erd", "visual": "shot:erd", "motion": [(0, 0, 1), (0.25, 0.08, 0.6)], "lines": lines(
        "Sơ đồ quan hệ thực thể cho thấy 19 khóa ngoại nối các bảng với nhau.",
        "Bảng cấu hình lưu lại linh kiện, cảnh báo và công suất tại thời điểm tạo, nên trang chia sẻ luôn hiển thị đúng kết luận đã đưa ra.",
        "Đơn hàng cũng chụp lại tên và giá từng món lúc mua, nên đổi giá về sau không làm sai đơn cũ.",
    )},
    {"id": "s14-end", "visual": "slide:end", "motion": [(0, 0, 1), (0.03, 0.03, 0.94)], "lines": lines(
        "Đó là cách PC Builder bảo đảm mọi bộ máy được gợi ý đều lắp được, đủ điện và vừa ngân sách.",
        "Cảm ơn thầy cô và các bạn đã theo dõi.",
    )},
]
