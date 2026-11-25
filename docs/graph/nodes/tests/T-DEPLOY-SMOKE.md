---
id: T-DEPLOY-SMOKE
type: test
title: "Smoke test sau triển khai"
status: done
chapters: ["CH4"]
links:
  verifies: ["NFR-07", "F-DEPLOY"]
code: []
tests: ["e2e/smoke.spec.ts"]
diagrams: []
---

`e2e/smoke.spec.ts` (dự án Playwright `smoke`, không phụ thuộc đăng nhập, chỉ tạo một phiên chat): `/api/health` trả `{status:"ok", db:"up", redis:"up"}`, trang chủ tải được và có ô nhập của trợ lý, một lượt chat "chơi game 25 triệu" kết thúc bằng sự kiện `done` và có ít nhất một cấu hình.

Chạy sau khi `docker compose -f infra/docker-compose.prod.yml up`: `E2E_BASE_URL=https://<host> E2E_API_URL=https://<host>/api pnpm e2e --project=smoke` (khi có `E2E_BASE_URL` thì Playwright không tự khởi động server cục bộ).

**Trạng thái kiểm chứng (2026-11-08):** đạt trên môi trường cục bộ (API dev + web build production). Chưa chạy trên máy chủ đám mây thật trong phạm vi task QA (không được bật/tắt Docker), nên NFR-07 mới được kiểm ở mức "bộ kiểm thử sẵn sàng".
