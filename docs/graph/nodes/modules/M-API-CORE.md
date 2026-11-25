---
id: M-API-CORE
type: module
title: "Khung ứng dụng API: Express app, middleware, lỗi chuẩn, cấu hình"
status: done
chapters: ["CH4"]
links:
  realizes: ["NFR-03"]
  dependsOn: ["M-DB", "M-SHARED"]
  decidedBy: ["ADR-002", "ADR-006"]
code: ["apps/api/src/app.ts", "apps/api/src/routes.ts", "apps/api/src/deps.ts", "apps/api/src/server.ts", "apps/api/src/middleware/**", "apps/api/src/lib/**", "apps/api/src/config/**"]
tests: ["apps/api/src/app.test.ts"]
diagrams: []
---

**Mục đích:** bộ khung để các module nghiệp vụ cắm vào theo cùng một cách.

**Mô tả:**
- `createApp(deps)` dựng Express 5 với helmet, CORS theo whitelist (`WEB_ORIGIN`), log `pino-http` (ẩn header Authorization và Cookie), JSON giới hạn 1 MB, cookie-parser, middleware `guestId` và `optionalAuth`, gắn router tại `/api`, cuối cùng là `notFoundHandler` và `errorHandler`.
- `AppDeps` (db, redis, env, llm tùy chọn, now) được truyền vào mọi module để test thay bằng đối tượng thật hoặc giả - `llm` trống nghĩa là chatbot chạy dự phòng.
- `errors.ts`: `AppError(status, code, message)` và định dạng lỗi chuẩn `{error:{code,message,details}}`; lỗi Zod trả 422 `VALIDATION_ERROR` kèm đường dẫn trường.
- `auth.ts`: ký/kiểm access token (15 phút), `optionalAuth`, `requireAuth`, `requireRole`.
- `env.ts`: đọc và kiểm tra biến môi trường bằng Zod; production từ chối secret mặc định.
- `routes.ts`: mỗi module sở hữu đầy đủ sub-path của mình nên router được gắn ở gốc `/api`; `GET /health` kiểm tra db, redis và chế độ AI.
