---
id: T-DEPLOY-SMOKE
type: test
title: "Smoke test sau triển khai"
status: planned
chapters: ["CH4"]
links:
  verifies: ["NFR-07", "F-DEPLOY"]
code: []
tests: ["e2e/smoke.spec.ts"]
diagrams: []
---

Chạy sau khi `docker compose -f infra/docker-compose.prod.yml up`: `/api/health` trả `ok`, trang chủ tải được qua HTTPS, một luồng chat ngắn trả về cấu hình.
