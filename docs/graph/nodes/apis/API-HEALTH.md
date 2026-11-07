---
id: API-HEALTH
type: api
title: "Kiểm tra sức khỏe hệ thống"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-DEPLOY"]
  dependsOn: ["M-API-CORE"]
code: ["apps/api/src/routes.ts"]
tests: ["apps/api/src/app.test.ts"]
diagrams: []
---

**Endpoint:**
- `GET /api/health`

Trả `{status, db, redis, ai}`: `ok` (200) khi Postgres và Redis đều lên, `degraded` (503) khi một trong hai xuống; `ai` là `gemini` hoặc `fallback`. Dùng cho healthcheck triển khai và test.
