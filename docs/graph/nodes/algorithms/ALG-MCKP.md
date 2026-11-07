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

**Mô hình hóa (phiếu giao nhiệm vụ, nội dung 3):** mỗi danh mục là một **lớp**, phải chọn đúng một sản phẩm từ mỗi lớp. Giá trị của sản phẩm `v = w_purpose[c] × normScore(item) + commercialBoost(item)`, trọng lượng là giá, sức chứa là ngân sách.

**Ma trận trọng số `w_purpose`** và khoảng phân bổ ngân sách gợi ý (min-max % cho từng danh mục) nằm trong bảng `purpose_weights` và admin chỉnh được (FR-14). Ví dụ: mục đích chơi game dồn trọng số vào GPU và CPU đơn nhân; AI dồn vào VRAM và RAM; văn phòng coi trọng giá.

**Quyết định:** khoảng phân bổ % được dùng để **sắp xếp miền và làm heuristic** (giá trị nằm trong khoảng được ưu tiên) chứ không phải ràng buộc cứng, để không làm mất lời giải tốt chỉ vì lệch tỷ lệ gợi ý. Việc giải chính xác kết hợp ràng buộc tương thích do backtracking + B&B đảm nhiệm vì MCKP thuần không biểu diễn được ràng buộc giữa các lớp.
