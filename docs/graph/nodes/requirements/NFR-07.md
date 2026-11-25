---
id: NFR-07
type: requirement
title: "Đóng gói và triển khai bằng Docker trên máy chủ đám mây"
status: done
chapters: ["CH2"]
code: []
tests: []
diagrams: []
---

**Nguồn:** phiếu giao nhiệm vụ mục 3.2 (Đóng gói bằng Docker và Docker Compose, triển khai trên nền tảng máy chủ đám mây) và nội dung 6.

Hạ tầng dev (PostgreSQL, Redis) chạy bằng Docker Compose; bản production gồm web, api, postgres, redis và Caddy (HTTPS tự động) triển khai trên một VPS Ubuntu, có hướng dẫn triển khai.
