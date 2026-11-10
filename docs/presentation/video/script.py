# Scenes, narration and camera motion. Each line is (say, cap): `say` spells English terms the way Vietnamese
# speakers pronounce them for the TTS voice, `cap` is the subtitle. Motion (x, y, s) is the visible window as
# fractions of the image: top-left corner and size.

SCENES = [
    {
        "id": "s01-title", "visual": "slide:title", "motion": [(0, 0, 1), (0.03, 0.03, 0.94)],
        "lines": [
            ("PC Builder.", "PC Builder."),
            ("Hệ thống thương mại điện tử linh kiện máy tính, tích hợp trợ lý trí tuệ nhân tạo gợi ý cấu hình PC phù hợp nhu cầu người dùng.",
             "Hệ thống thương mại điện tử linh kiện máy tính, tích hợp trợ lý AI gợi ý cấu hình PC phù hợp nhu cầu người dùng."),
        ],
    },
    {
        "id": "s02-problem", "visual": "slide:problem", "motion": [(0, 0, 1), (0.02, 0.02, 0.96)],
        "lines": [
            ("Lắp một bộ máy tính không hề đơn giản.", "Lắp một bộ máy tính không hề đơn giản."),
            ("Người mua phải chọn đủ tám linh kiện, từ xê pê u, mên bót, ram, đến cạc đồ họa, nguồn và vỏ kây.",
             "Người mua phải chọn đủ 8 linh kiện, từ CPU, mainboard, RAM đến card đồ họa, nguồn và vỏ case."),
            ("Chỉ cần sai sóc két, sai chuẩn ram, hay nguồn không đủ công suất, là cả bộ máy không chạy.",
             "Chỉ cần sai socket, sai chuẩn RAM hay nguồn không đủ công suất là cả bộ máy không chạy."),
            ("Trong khi đó, phần lớn người mua chỉ biết mình muốn chơi game hay làm đồ họa, và có bao nhiêu tiền.",
             "Trong khi đó, phần lớn người mua chỉ biết mình muốn chơi game hay làm đồ họa, và có bao nhiêu tiền."),
        ],
    },
    {
        "id": "s03-home", "visual": "shot:home", "motion": [(0, 0, 1), (0.52, 0.26, 0.46)],
        "lines": [
            ("PC Builder giải quyết bài toán đó. Người dùng chỉ cần kể nhu cầu bằng tiếng Việt.",
             "PC Builder giải quyết bài toán đó: người dùng chỉ cần kể nhu cầu bằng tiếng Việt."),
            ("Ngay trên trang chủ là kết quả thật của bộ máy tối ưu. Với nhu cầu chơi game hai mươi lăm triệu, hệ thống chọn tám linh kiện có sẵn trong kho, tổng giá vừa khít ngân sách.",
             "Ngay trên trang chủ là kết quả thật của bộ máy tối ưu: chơi game 25 triệu, 8 linh kiện có sẵn trong kho, tổng giá vừa khít ngân sách."),
            ("Và hệ thống cho biết đã xét gần hai nghìn phương án, chỉ trong vài mi li giây.",
             "Hệ thống cho biết đã xét gần 2.000 phương án chỉ trong vài mili giây."),
        ],
    },
    {
        "id": "s04-advisor", "visual": "shot:advisor", "motion": [(0, 0, 1), (0.38, 0.16, 0.62)],
        "lines": [
            ("Tại trang tư vấn, khách trò chuyện với trợ lý ây ai.", "Tại trang tư vấn, khách trò chuyện với trợ lý AI."),
            ("Chỉ một câu: chơi game hai mươi lăm triệu, trợ lý trả về ba cấu hình để so sánh: tối ưu hiệu năng, cân bằng, và tiết kiệm.",
             "Chỉ một câu “chơi game 25 triệu”, trợ lý trả về 3 cấu hình: tối ưu hiệu năng, cân bằng và tiết kiệm."),
            ("Mỗi cấu hình là một bảng linh kiện với giá từng món, thanh phân bổ ngân sách tám màu, điểm hiệu năng, và trạng thái tương thích.",
             "Mỗi cấu hình là một bảng linh kiện: giá từng món, thanh phân bổ ngân sách 8 màu, điểm hiệu năng và trạng thái tương thích."),
            ("Khách có thể nhắn tiếp, như rẻ hơn ba triệu, hay đổi sang cạc A em đê, để chỉnh cấu hình.",
             "Khách có thể nhắn tiếp “rẻ hơn 3 triệu” hay “đổi sang card AMD” để chỉnh cấu hình."),
        ],
    },
    {
        "id": "s05-builder", "visual": "shot:builder", "motion": [(0, 0, 1), (0.04, 0.12, 0.7)],
        "lines": [
            ("Người dùng muốn tự chọn thì dùng trang tự build.", "Người dùng muốn tự chọn thì dùng trang Tự build PC."),
            ("Mỗi khi chọn một linh kiện, hệ thống kiểm tra ngay mười lăm luật tương thích, báo xung đột kèm lý do, và ước tính công suất để gợi ý nguồn phù hợp.",
             "Mỗi linh kiện được kiểm tra ngay với 15 luật tương thích, báo xung đột kèm lý do, ước tính công suất và gợi ý nguồn."),
            ("Cấu hình có thể lưu, chia sẻ, xuất báo giá pê đê ép, hoặc thêm cả bộ vào giỏ.",
             "Cấu hình có thể lưu, chia sẻ, xuất báo giá PDF hoặc thêm cả bộ vào giỏ."),
        ],
    },
    {
        "id": "s06-catalog", "visual": "shot:category", "motion": [(0, 0, 1), (0.08, 0.1, 0.8)],
        "lines": [
            ("Phần cửa hàng có đầy đủ danh mục, và bộ lọc theo thông số kỹ thuật như sóc két, chuẩn ram, hay dung lượng.",
             "Cửa hàng có đầy đủ danh mục và bộ lọc theo thông số kỹ thuật: socket, chuẩn RAM, dung lượng…"),
        ],
    },
    {
        "id": "s07-product", "visual": "shot:product", "motion": [(0.05, 0.08, 0.9), (0.45, 0.12, 0.55)],
        "lines": [
            ("Trang chi tiết hiển thị bảng thông số, và điểm hiệu năng đo bằng bén mác.",
             "Trang chi tiết hiển thị bảng thông số và điểm hiệu năng benchmark."),
        ],
    },
    {
        "id": "s08-cart", "visual": "shot:cart", "motion": [(0, 0, 1), (0.05, 0.08, 0.75)],
        "lines": [
            ("Khi đặt hàng, khách chọn mua lẻ, hoặc đặt lắp ráp nguyên bộ.",
             "Khi đặt hàng, khách chọn mua lẻ hoặc đặt lắp ráp nguyên bộ."),
        ],
    },
    {
        "id": "s09-pay", "visual": "shot:pay", "motion": [(0, 0, 1), (0.04, 0.12, 0.6)],
        "lines": [
            ("Thanh toán bằng mã Việt Q R động. Số tiền và nội dung chuyển khoản đã được điền sẵn.",
             "Thanh toán bằng mã VietQR động: số tiền và nội dung chuyển khoản đã điền sẵn."),
            ("Ngân hàng báo về qua web húc, và đơn được xác nhận tự động trong vài giây.",
             "Ngân hàng báo về qua webhook, đơn được xác nhận tự động trong vài giây."),
            ("Hàng được giữ mười lăm phút, và hệ thống bảo đảm không bao giờ bán quá số hàng còn trong kho.",
             "Hàng được giữ 15 phút, và hệ thống bảo đảm không bao giờ bán quá số hàng còn trong kho."),
        ],
    },
    {
        "id": "s10-admin", "visual": "shot:admin", "motion": [(0, 0, 1), (0.13, 0.0, 0.87)],
        "lines": [
            ("Người quản trị có trang tổng quan doanh thu, quản lý sản phẩm, tồn kho, đơn hàng, đối soát chuyển khoản, và xem lại từng cuộc hội thoại của trợ lý ây ai.",
             "Người quản trị có tổng quan doanh thu, quản lý sản phẩm, tồn kho, đơn hàng, đối soát chuyển khoản và xem lại từng hội thoại AI."),
        ],
    },
    {
        "id": "s11-weights", "visual": "shot:weights", "motion": [(0, 0, 1), (0.14, 0.1, 0.75)],
        "lines": [
            ("Đặc biệt, trọng số của thuật toán theo từng mục đích sử dụng có thể chỉnh trực tiếp, và gợi ý mới thay đổi ngay.",
             "Trọng số của thuật toán theo từng mục đích sử dụng có thể chỉnh trực tiếp, và gợi ý mới thay đổi ngay."),
        ],
    },
    {
        "id": "s12-arch", "visual": "slide:arch", "motion": [(0, 0, 1), (0.02, 0.02, 0.96)],
        "lines": [
            ("Về kỹ thuật, hệ thống gồm giao diện Nếch giây ét, máy chủ A P I Nốt giây ét, cơ sở dữ liệu Pốt grét, với thông số linh kiện lưu dạng giây sơn bê.",
             "Về kỹ thuật: giao diện Next.js, máy chủ API Node.js, cơ sở dữ liệu PostgreSQL với thông số linh kiện lưu dạng JSONB."),
            ("Rê đít làm bộ nhớ đệm, và mô hình Giê mi nai của Gu gồ.", "Redis làm bộ nhớ đệm, và mô hình Gemini của Google."),
            ("Tất cả được đóng gói bằng Đốc cơ, và chạy trên một máy chủ ảo.", "Tất cả đóng gói bằng Docker và chạy trên một máy chủ ảo (VPS)."),
        ],
    },
    {
        "id": "s13-calling", "visual": "slide:calling", "motion": [(0, 0, 1), (0.02, 0.02, 0.96)],
        "lines": [
            ("Điểm then chốt là cách trợ lý ây ai hoạt động. Giê mi nai không tự biết gì về kho hàng.",
             "Điểm then chốt là cách trợ lý AI hoạt động: Gemini không tự biết gì về kho hàng."),
            ("Mỗi lần gọi, máy chủ gửi kèm mô tả năm công cụ.", "Mỗi lần gọi, máy chủ gửi kèm mô tả 5 công cụ."),
            ("Khi cần dữ liệu, Giê mi nai trả về một yêu cầu gọi công cụ, ví dụ gợi ý cấu hình với ngân sách hai mươi lăm triệu.",
             "Khi cần dữ liệu, Gemini trả về một yêu cầu gọi công cụ, ví dụ recommend_builds với ngân sách 25 triệu."),
            ("Máy chủ chạy công cụ trên dữ liệu thật, gửi kết quả lại, rồi Giê mi nai mới viết lời giải thích. Kỹ thuật này gọi là phăng sần co linh.",
             "Máy chủ chạy công cụ trên dữ liệu thật, gửi kết quả lại, rồi Gemini mới viết lời giải thích. Kỹ thuật này gọi là function calling."),
        ],
    },
    {
        "id": "s14-guard", "visual": "slide:guard", "motion": [(0, 0, 1), (0.02, 0.02, 0.96)],
        "lines": [
            ("Để trợ lý không bịa, mô hình ngôn ngữ chỉ điều phối, còn bộ máy tối ưu quyết định linh kiện.",
             "Để trợ lý không bịa: mô hình ngôn ngữ chỉ điều phối, bộ máy tối ưu quyết định linh kiện."),
            ("Bảng cấu hình hiển thị cho khách lấy trực tiếp từ dữ liệu, không qua lời của mô hình.",
             "Bảng cấu hình hiển thị cho khách lấy trực tiếp từ dữ liệu, không qua lời của mô hình."),
            ("Sau mỗi lượt, máy chủ còn đối chiếu mọi con số tiền mà mô hình viết ra với số liệu thật.",
             "Sau mỗi lượt, máy chủ đối chiếu mọi số tiền mô hình viết ra với số liệu thật."),
        ],
    },
    {
        "id": "s15-engine", "visual": "slide:engine", "motion": [(0, 0, 1), (0.02, 0.02, 0.96)],
        "lines": [
            ("Trái tim của hệ thống là bộ máy tối ưu. Bài toán được mô hình hóa thành bài toán thỏa mãn ràng buộc, kết hợp bài toán ba lô nhiều lựa chọn.",
             "Trái tim của hệ thống là Optimization Engine: bài toán thỏa mãn ràng buộc (CSP) kết hợp bài toán ba lô nhiều lựa chọn (MCKP)."),
            ("Engine dùng A xê ba để loại trước các linh kiện không thể ghép, quay lui có kiểm tra tiến, và nhánh cận, với cận trên từ bài toán ba lô nới lỏng.",
             "Engine dùng AC-3 loại trước linh kiện không thể ghép, quay lui có Forward Checking, và Branch & Bound với cận trên từ MCKP nới lỏng."),
            ("Với hai trăm năm mươi sản phẩm, engine giải trong khoảng mười một mi li giây, trong khi vét cạn không thể chạy xong.",
             "Với 250 sản phẩm, engine giải trong khoảng 11 mili giây, trong khi vét cạn không chạy xong."),
            ("Trên một nghìn năm trăm trường hợp kiểm chứng, kết quả trùng khớp hoàn toàn với vét cạn.",
             "Trên 1.512 trường hợp kiểm chứng, kết quả trùng khớp hoàn toàn với vét cạn."),
        ],
    },
    {
        "id": "s16-fallback", "visual": "slide:fallback", "motion": [(0, 0, 1), (0.02, 0.02, 0.96)],
        "lines": [
            ("Giê mi nai dùng gói miễn phí, nên có lúc hết lượt, hoặc chậm.", "Gemini dùng gói miễn phí nên có lúc hết lượt hoặc chậm."),
            ("Khi đó, hệ thống tự chuyển sang chế độ dự phòng: một bộ phân tích tiếng Việt theo luật, hiểu được những cách nói như hai lăm củ, hay rẻ hơn ba triệu.",
             "Khi đó hệ thống tự chuyển sang chế độ dự phòng: bộ phân tích tiếng Việt theo luật, hiểu “25 củ” hay “rẻ hơn 3 triệu”."),
            ("Bộ phân tích này vẫn gọi cùng bộ máy tối ưu, nên người dùng luôn nhận được câu trả lời.",
             "Bộ phân tích này vẫn gọi cùng engine tối ưu, nên người dùng luôn nhận được câu trả lời."),
        ],
    },
    {
        "id": "s17-quality", "visual": "slide:quality", "motion": [(0, 0, 1), (0.02, 0.02, 0.96)],
        "lines": [
            ("Chất lượng được kiểm chứng bằng hơn một nghìn bài kiểm thử tự động, mười hai kịch bản kiểm thử đầu cuối trên cả máy tính và điện thoại, và bộ đánh giá trợ lý ây ai ba mươi kịch bản.",
             "Hơn 1.000 bài kiểm thử tự động, 12 kịch bản kiểm thử đầu cuối trên máy tính và điện thoại, bộ đánh giá AI 30 kịch bản."),
            ("Toàn bộ đặc tả, mã nguồn và kiểm thử được liên kết thành một đồ thị truy vết, phục vụ viết báo cáo.",
             "Đặc tả, mã nguồn và kiểm thử được liên kết thành một đồ thị truy vết, phục vụ viết báo cáo."),
        ],
    },
    {
        "id": "s18-end", "visual": "slide:end", "motion": [(0.03, 0.03, 0.94), (0, 0, 1)],
        "lines": [
            ("PC Builder. Nói nhu cầu, nhận cấu hình đúng ngân sách, từ hàng có sẵn trong kho.",
             "PC Builder: nói nhu cầu, nhận cấu hình đúng ngân sách, từ hàng có sẵn trong kho."),
            ("Cảm ơn mọi người đã theo dõi.", "Cảm ơn mọi người đã theo dõi."),
        ],
    },
]
