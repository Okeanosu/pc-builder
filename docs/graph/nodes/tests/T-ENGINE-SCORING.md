---
id: T-ENGINE-SCORING
type: test
title: "Unit test chuẩn hóa điểm và mô hình MCKP"
status: done
chapters: ["CH4"]
links:
  verifies: ["ALG-SCORING", "ALG-MCKP", "FR-14"]
code: []
tests: ["packages/engine/src/scoring.test.ts"]
diagrams: []
---

`scoring.test.ts` (25 ca): điểm nằm trong 0-100; đổi trọng số theo mục đích đổi thứ hạng đúng kỳ vọng (gaming ưu tiên GPU, văn phòng ưu tiên giá); `commercialBoost` làm tăng điểm có kiểm soát.

Hiệu ứng đầu-cuối của trọng số còn được kiểm bằng E2E `T-E2E-ADMIN-WEIGHTS`: tăng trọng số GPU của "Chơi game" từ 0,42 lên 0,60 thì tỷ trọng GPU của cấu hình "Tối ưu hiệu năng" 25 triệu tăng từ 56,9% lên 65,6% trên dữ liệu seed.
