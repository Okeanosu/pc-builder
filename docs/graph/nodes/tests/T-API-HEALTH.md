---
id: T-API-HEALTH
type: test
title: "Test health check và định dạng lỗi chuẩn"
status: done
chapters: ["CH4"]
links:
  verifies: ["API-HEALTH", "M-API-CORE", "M-DB", "M-INFRA"]
code: []
tests: ["apps/api/src/app.test.ts"]
diagrams: []
---

Chạy với Postgres/Redis thật: `GET /api/health` trả `{status:"ok", db:"up", redis:"up", ai:"fallback"}` khi không có khóa Gemini; route không tồn tại trả 404 với mã `ROUTE_NOT_FOUND` theo định dạng lỗi chuẩn.
