---
id: NFR-08
type: requirement
title: "Khả năng kiểm thử: Engine đạt tối thiểu 90% branch coverage"
status: done
chapters: ["CH2"]
code: []
tests: []
diagrams: []
---

**Nguồn:** phiếu giao nhiệm vụ mục 3.3 (viết Unit Test cho các quy tắc ràng buộc phần cứng, Integration Test cho luồng đặt hàng và thanh toán) và nội dung 5.

Engine là hàm thuần nên unit test từng luật C01-C15 (đúng/sai/biên), AC-3, forward checking, Branch & Bound; mục tiêu tối thiểu 90% branch coverage cho `packages/engine`. Có integration test cho các luồng đặt hàng - thanh toán trên Postgres/Redis thật và E2E cho 3 luồng cốt lõi.
