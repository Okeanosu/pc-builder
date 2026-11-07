---
id: T-ENGINE-SCORING
type: test
title: "Unit test chuẩn hóa điểm và mô hình MCKP"
status: planned
chapters: ["CH4"]
links:
  verifies: ["ALG-SCORING", "ALG-MCKP", "FR-14"]
code: []
tests: ["packages/engine/src/scoring/**/*.test.ts"]
diagrams: []
---

Điểm nằm trong 0-100; đổi trọng số theo mục đích đổi thứ hạng đúng kỳ vọng (gaming ưu tiên GPU, văn phòng ưu tiên giá); `commercialBoost` làm tăng điểm có kiểm soát.
