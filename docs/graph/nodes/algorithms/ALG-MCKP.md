---
id: ALG-MCKP
type: algorithm
title: "Mô hình Bài toán cái túi đa lựa chọn (MCKP) để phân bổ ngân sách"
status: done
chapters: ["CH4", "CH5"]
links:
  refines: ["F-ENGINE-CORE"]
  dependsOn: ["ALG-SCORING", "ALG-BNB"]
code: ["packages/engine/src/search.ts", "packages/engine/src/domains.ts"]
tests: ["packages/engine/src/strategies.test.ts", "packages/engine/src/domains.test.ts", "packages/engine/bench/equivalence.ts"]
diagrams: []
---

**Mô hình hóa (phiếu giao nhiệm vụ, nội dung 3):** mỗi danh mục là một **lớp**, phải chọn đúng một sản phẩm từ mỗi lớp. Trọng lượng là giá, sức chứa là ngân sách. Trong `domains.ts`, giá trị của một sản phẩm là `w_purpose[c] × (điểm × hệ số CUDA + 5 × commercialBoost)` cộng thưởng màu (case 3 điểm, tản nhiệt/RAM/mainboard 1,5 điểm). Với văn phòng, miền GPU có thêm giá trị "không GPU" để cấu hình dùng đồ họa tích hợp. Hàm mục tiêu của một cấu hình hoàn chỉnh là tổng giá trị trừ các phạt mềm (mỗi cảnh báo C08, C09, C13, C15 trừ 2 điểm): đây là bài toán CSP có trọng số.

**Ma trận trọng số `w_purpose`** và khoảng phân bổ ngân sách gợi ý (trọng số ± 0,08, kẹp trong [0, 1]; GPU văn phòng cố định {0, 0}) nằm trong bảng `purpose_weights`, admin chỉnh được (FR-14). Với chơi game độ phân giải 1440p chuyển 0,04 trọng số từ CPU sang GPU, 4K chuyển 0,08.

**Vai trò của MCKP trong lời giải chính xác:** MCKP thuần không biểu diễn được ràng buộc giữa các lớp (socket, kích thước), nên việc giải chính xác do tìm kiếm có quay lui + forward checking đảm nhiệm. MCKP cung cấp **cận trên**: nới lỏng tuyến tính của MCKP trên các lớp còn lại, bằng đường bao lồi giá-giá trị và bước đi tham lam theo hiệu suất (xem ALG-BNB). Khoảng phân bổ % chỉ dùng để sắp xếp thứ tự giá trị thử (giá trị nằm trong khoảng được thử trước), không phải ràng buộc cứng, để không bỏ mất lời giải tốt chỉ vì lệch tỷ lệ gợi ý.

**Tiền xử lý dominance:** trong mainboard, RAM, ổ cứng, nguồn, case và tản nhiệt, loại sản phẩm B nếu có sản phẩm A giá trị ≥, giá ≤ và không kém linh hoạt hơn B dưới mọi luật cứng và phạt mềm liên quan. Trung bình loại 66 giá trị ở catalog 250 sản phẩm và 156 ở catalog 500. CPU và GPU không bao giờ bị loại vì chúng tạo ra sự đa dạng giữa các cấu hình.

**Ghi chú cho báo cáo:** hệ số thương mại nhân vào (điểm + 5 × boost) chứ không cộng như công thức spec, và điểm văn phòng không nhạy giá: hai khác biệt đã biết so với mô hình trong spec (báo cáo task 3).
