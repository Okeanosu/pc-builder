# Relationship, index, JSONB and scenario content for the database report. Facts come from the live schema
# (information_schema, pg_indexes) and apps/api/src/db/schema.ts; sample values from samples.json.

# (from_table, from_col, to_table, cardinality, on_delete, meaning)
FKS = [
    ("products", "category_id", "categories", "N – 1", "NO ACTION",
     "Mỗi linh kiện thuộc đúng một danh mục; một danh mục có nhiều linh kiện. Danh mục còn sản phẩm thì không xóa được."),
    ("products", "brand_id", "brands", "N – 1", "NO ACTION",
     "Mỗi linh kiện có một hãng; tên hãng nằm một chỗ nên lọc theo hãng không bị sai chính tả."),
    ("benchmarks", "product_id", "products", "0..1 – 1", "CASCADE",
     "Khóa ngoại đồng thời là khóa chính, nên mỗi sản phẩm có tối đa một dòng điểm. Điểm sống cùng sản phẩm."),
    ("inventory_movements", "product_id", "products", "N – 1", "CASCADE",
     "Nhật ký kho của từng sản phẩm. Thực tế sản phẩm chỉ bị ẩn chứ không xóa, nên nhật ký được giữ."),
    ("inventory_movements", "actor_id", "users", "N – 0..1", "NO ACTION",
     "Người nhập hoặc điều chỉnh kho; NULL khi hệ thống tự ghi (thanh toán, hủy đơn tự động)."),
    ("purpose_weights", "updated_by", "users", "N – 0..1", "NO ACTION",
     "Quản trị viên sửa trọng số lần cuối; NULL với dữ liệu khởi tạo."),
    ("builds", "user_id", "users", "N – 0..1", "NO ACTION",
     "Chủ sở hữu cấu hình; NULL với cấu hình của khách vãng lai (vẫn mở được qua đường dẫn /builds/{id})."),
    ("carts", "user_id", "users", "0..1 – 1", "CASCADE",
     "Mỗi tài khoản đúng một giỏ (cột có ràng buộc UNIQUE). Xóa tài khoản thì giỏ đi theo."),
    ("cart_items", "cart_id", "carts", "N – 1", "CASCADE",
     "Dòng hàng thuộc một giỏ; xóa giỏ xóa luôn các dòng."),
    ("cart_items", "product_id", "products", "N – 1", "NO ACTION",
     "Sản phẩm trong dòng giỏ."),
    ("cart_items", "build_id", "builds", "N – 0..1", "NO ACTION",
     "Dòng thuộc một bộ cấu hình khi khách “thêm cả bộ vào giỏ”; NULL nếu mua lẻ. Giỏ nhóm các dòng theo build_id."),
    ("orders", "user_id", "users", "N – 0..1", "NO ACTION",
     "Tài khoản đặt hàng; NULL với khách vãng lai, khi đó guest_id cho biết ai đặt."),
    ("orders", "build_id", "builds", "N – 0..1", "NO ACTION",
     "Cấu hình được lắp với đơn BUILD; NULL với đơn lẻ."),
    ("order_items", "order_id", "orders", "N – 1", "CASCADE",
     "Dòng hàng của đơn; là phần của đơn nên xóa đơn thì dòng đi theo."),
    ("order_items", "product_id", "products", "N – 1", "NO ACTION",
     "Sản phẩm đã bán. NO ACTION bảo vệ lịch sử bán hàng: sản phẩm đã có trong đơn thì không xóa được, chỉ ẩn."),
    ("order_items", "build_id", "builds", "N – 0..1", "NO ACTION",
     "Bộ cấu hình mà dòng thuộc về, với đơn lắp ráp."),
    ("payments", "order_id", "orders", "N – 0..1", "NO ACTION",
     "Giao dịch thanh toán cho đơn. NULL khi tiền về mà nội dung chuyển khoản không chứa mã đơn hợp lệ."),
    ("chat_sessions", "user_id", "users", "N – 0..1", "NO ACTION",
     "Chủ phiên chat khi đã đăng nhập; NULL thì guest_id là chủ."),
    ("chat_messages", "session_id", "chat_sessions", "N – 1", "CASCADE",
     "Tin nhắn thuộc một phiên; xóa phiên xóa cả hội thoại."),
]

# Links that exist in the data but are not declared as foreign keys: (from, to, how, why)
SOFT = [
    ("chat_messages.build_ids", "builds.id",
     "Mảng JSONB chứa id các cấu hình tạo ra trong lượt chat.",
     "Một tin có thể gắn 0–3 cấu hình; mảng gọn hơn một bảng nối và chỉ dùng để hiển thị lại. Tra cứu bằng phép chứa <code>build_ids @&gt; '[\"…\"]'</code>."),
    ("builds.items[].productId", "products.id",
     "Mỗi phần tử của items ghi productId kèm tên và giá lúc tạo.",
     "Là ảnh chụp: trang chia sẻ hiện đúng tên và giá lúc gợi ý; khi đặt hàng, server nạp lại sản phẩm theo id để lấy giá hiện tại."),
    ("builds.purpose", "purpose_weights.purpose",
     "Cùng tập giá trị gaming, graphics, ai, office.",
     "Danh sách mục đích cố định trong code (<code>PURPOSES</code>); không cần khóa ngoại."),
    ("payments.transfer_content", "orders.code",
     "Nội dung chuyển khoản chứa mã đơn dạng PCB + 8 ký tự.",
     "Webhook SePay tách mã bằng biểu thức <code>PCB[A-Z2-7]{8}</code> rồi mới điền payments.order_id."),
    ("orders.guest_id, chat_sessions.guest_id", "cookie gid, Redis cart:guest:{gid}",
     "Mã khách vãng lai lưu trong cookie.",
     "Khách chưa đăng nhập vẫn sở hữu được phiên chat, giỏ hàng (trong Redis) và đơn hàng."),
    ("inventory_movements.ref", "orders.code",
     "Với ORDER và CANCEL, ref là mã đơn.",
     "Đối chiếu biến động kho với đơn hàng mà không ràng buộc chặt (ref còn dùng cho ghi chú nhập hàng)."),
]

# (table, index, columns / method, purpose)
INDEXES = [
    ("products", "products_specs_gin", "GIN (specs jsonb_path_ops)", "Lọc theo thông số bằng phép chứa @>, ví dụ socket = AM5."),
    ("products", "products_category_price_idx", "B-tree (category_id, price)", "Trang danh mục sắp theo giá, Engine lấy sản phẩm theo danh mục."),
    ("products", "products_name_search_idx", "GIN (to_tsvector('simple', name))", "Tìm sản phẩm theo tên ở ô tìm kiếm và công cụ search_products của chatbot."),
    ("products", "products_sku_unique, products_slug_unique", "UNIQUE B-tree", "Không trùng mã hàng và đường dẫn /p/{slug}."),
    ("categories", "categories_key_unique, categories_slug_unique", "UNIQUE B-tree", "Mã danh mục dùng trong code và URL không trùng."),
    ("brands", "brands_name_unique", "UNIQUE B-tree", "Mỗi hãng một dòng."),
    ("users", "users_email_unique", "UNIQUE B-tree", "Một email một tài khoản; tra cứu khi đăng nhập."),
    ("carts", "carts_user_id_unique", "UNIQUE B-tree", "Biến quan hệ users – carts thành 1 – 1."),
    ("cart_items", "cart_items_cart_product_build_uq", "UNIQUE NULLS NOT DISTINCT (cart_id, product_id, build_id)", "Thêm cùng món hai lần chỉ tăng số lượng (upsert ON CONFLICT), kể cả dòng mua lẻ có build_id NULL."),
    ("builds", "builds_user_idx", "B-tree (user_id)", "Trang “Cấu hình của tôi”."),
    ("orders", "orders_code_unique", "UNIQUE B-tree (code)", "Tra đơn theo mã khi webhook báo tiền về."),
    ("orders", "orders_user_idx", "B-tree (user_id, created_at)", "“Đơn hàng của tôi”, mới nhất trước."),
    ("orders", "orders_status_expires_idx", "B-tree (status, expires_at)", "Job mỗi phút tìm đơn PENDING_PAYMENT đã quá hạn giữ hàng."),
    ("payments", "payments_provider_txn_id_unique", "UNIQUE B-tree", "Webhook gửi lại cùng giao dịch cũng chỉ ghi một dòng."),
    ("payments", "payments_status_created_idx", "B-tree (status, created_at)", "Trang đối soát lọc giao dịch theo trạng thái."),
    ("inventory_movements", "inventory_movements_product_idx", "B-tree (product_id, created_at)", "Lịch sử kho của một sản phẩm."),
    ("chat_messages", "chat_messages_session_idx", "B-tree (session_id, created_at)", "Đọc 20 tin gần nhất của phiên để gửi lại cho Gemini."),
]

# JSONB meaning per category spec key
SPEC_KEYS = [
    ("cpu", "CPU", [("socket", "AM4 | AM5 | LGA1700 | LGA1851"), ("cores, threads", "số nhân, số luồng"), ("baseClockGHz, boostClockGHz", "xung cơ bản, xung tối đa"), ("tdpW", "công suất cơ sở (W)"), ("integratedGraphics", "có đồ họa tích hợp"), ("memoryTypes", "chuẩn RAM hỗ trợ, ví dụ [\"DDR4\",\"DDR5\"]")]),
    ("mainboard", "Mainboard", [("socket, chipset", "socket CPU, chipset (B650, Z790…)"), ("formFactor", "ATX | mATX | ITX"), ("memoryType", "DDR4 | DDR5"), ("memorySlots, maxMemoryGB", "số khe RAM, dung lượng tối đa"), ("m2Slots", "số khe M.2"), ("wifi, color", "có Wi-Fi, màu")]),
    ("ram", "RAM", [("type", "DDR4 | DDR5"), ("capacityGB, modules", "tổng dung lượng, số thanh"), ("speedMHz, casLatency", "tốc độ, độ trễ CL"), ("rgb, color", "có đèn, màu")]),
    ("gpu", "Card đồ họa", [("chipset, chipsetBrand", "GeForce RTX 4070… / NVIDIA | AMD | Intel"), ("vramGB", "bộ nhớ đồ họa"), ("lengthMm", "chiều dài card (mm)"), ("tgpW, recommendedPsuW", "công suất card, nguồn hãng khuyên dùng"), ("color", "màu")]),
    ("storage", "Ổ cứng", [("interface", "NVMe | SATA"), ("formFactor", "M.2 | 2.5\""), ("capacityGB", "dung lượng"), ("readMBps, writeMBps", "tốc độ đọc, ghi")]),
    ("psu", "Nguồn", [("wattage", "công suất (W)"), ("efficiency", "chuẩn hiệu suất, ví dụ 80+ Gold"), ("formFactor", "ATX | SFX"), ("modular, color", "dây rời, màu")]),
    ("case", "Vỏ case", [("supportedFormFactors", "cỡ mainboard lắp được"), ("maxGpuLengthMm, maxCoolerHeightMm", "card dài nhất, tản cao nhất (mm)"), ("radiatorSupportMm", "cỡ két tản nước lắp được, ví dụ [240, 360]"), ("psuFormFactors", "kiểu nguồn lắp được"), ("color", "màu")]),
    ("cooler", "Tản nhiệt", [("type", "air | aio"), ("sockets", "socket hỗ trợ"), ("heightMm", "chiều cao (tản khí)"), ("radiatorMm", "cỡ két (tản nước)"), ("tdpRatingW", "công suất tản định mức (W)"), ("rgb, color", "có đèn, màu")]),
]

MIGRATIONS = [
    ("0000_init.sql", "Tạo 9 kiểu enum, 15 bảng, khóa ngoại và chỉ mục ban đầu (216 dòng SQL)."),
    ("0001_commerce_hardening.sql", "payments.order_id cho phép NULL (ghi cả tiền không khớp đơn); thêm orders.guest_id cho đơn của khách vãng lai; chỉ mục payments(status, created_at); thay chỉ mục giỏ bằng ràng buộc UNIQUE NULLS NOT DISTINCT, kèm câu DELETE gộp dòng trùng có sẵn trước khi thêm ràng buộc."),
    ("0002_chat_price_check.sql", "Thêm cột chat_messages.price_check (JSONB) để ghi kết quả kiểm tra số tiền trong câu trả lời của AI."),
]

REDIS = [
    ("cart:guest:{gid}", "Giỏ hàng của khách vãng lai; gộp vào carts / cart_items khi khách đăng nhập."),
    ("catalog:version", "Số phiên bản danh mục; tăng mỗi khi sửa sản phẩm, lược đồ thông số hoặc trọng số."),
    ("cache:candidates:v{version}", "Danh mục dạng Engine (giá hiệu lực, tồn khả dụng, thông số, benchmark) theo phiên bản."),
    ("cache:reco:v{version}:{hash}", "Kết quả gợi ý đã giải cho cùng yêu cầu; phiên bản đổi thì tự hết hiệu lực."),
    ("rt:{userId}:{jti}", "Refresh token còn hiệu lực, để thu hồi được khi đăng xuất."),
    ("rl:{scope}:{subject}", "Bộ đếm giới hạn tần suất theo khách và theo IP: gợi ý cấu hình, gửi tin chat, tạo phiên chat, đăng ký tài khoản."),
    ("lock:checkout:{gid}, lock:cart-merge:{gid}", "Khóa ngắn chống bấm “Đặt hàng” hai lần và gộp giỏ chồng nhau."),
    ("chat:intent:{sessionId}, chat:build-request:{buildId}", "Ngữ cảnh ngắn hạn của chatbot giữa các lượt (yêu cầu gần nhất, tham số đã dùng để tạo cấu hình)."),
]

QUERIES = [
    ("Mainboard AM5 còn hàng, rẻ nhất trước (dùng chỉ mục GIN trên specs)",
     "SELECT p.name, p.price, p.specs->>'chipset' AS chipset\nFROM products p JOIN categories c ON c.id = p.category_id\nWHERE c.key = 'mainboard' AND p.status = 'ACTIVE'\n  AND p.specs @> '{\"socket\": \"AM5\"}'\n  AND p.stock - p.reserved > 0\nORDER BY p.price;",
     [("ASRock A620M-HDV/M.2", "1.890.000", "A620"), ("Gigabyte A620M GAMING X", "2.090.000", "A620"), ("MSI PRO B650M-A WIFI", "3.190.000", "B650")],
     ("name", "price", "chipset")),
    ("Doanh thu theo ngày từ đơn đã thanh toán",
     "SELECT paid_at::date AS ngay, count(*) AS so_don, sum(total) AS doanh_thu\nFROM orders WHERE payment_status = 'PAID'\nGROUP BY 1 ORDER BY 1;",
     [("2026-11-10", "2", "50.240.000")], ("ngay", "so_don", "doanh_thu")),
    ("Đơn hàng này bắt nguồn từ cuộc chat nào (đi qua quan hệ mềm build_ids)",
     "SELECT s.title, s.mode, m.created_at\nFROM orders o\nJOIN chat_messages m ON m.build_ids @> to_jsonb(ARRAY[o.build_id::text])\nJOIN chat_sessions s ON s.id = m.session_id\nWHERE o.code = 'PCB6ROVU7IJ' AND m.role = 'assistant';",
     [("chơi game 25 triệu", "FALLBACK", "2026-11-10 05:49:15")], ("title", "mode", "created_at")),
    ("Lịch sử kho của một sản phẩm",
     "SELECT m.created_at, m.delta, m.reason, m.ref\nFROM inventory_movements m JOIN products p ON p.id = m.product_id\nWHERE p.slug = 'intel-core-i5-12400'\nORDER BY m.created_at DESC;",
     [("2026-11-10 05:49:39", "−1", "ORDER", "PCB6ROVU7IJ"), ("2026-11-10 05:48:16", "−1", "ORDER", "PCBV3JQZCV7"), ("2026-11-07 18:27:26", "19", "IMPORT", "seed")],
     ("created_at", "delta", "reason", "ref")),
]
