---
id: F-DEPLOY
type: feature
title: "Đóng gói Docker và triển khai lên VPS / AWS ECS"
status: done
chapters: ["CH4", "CH6"]
links:
  realizes: ["NFR-07"]
  dependsOn: ["M-INFRA"]
  decidedBy: ["ADR-023"]
code: ["infra/docker-compose.prod.yml", "infra/Caddyfile", "infra/.env.prod.example", "apps/api/Dockerfile", "apps/web/Dockerfile", "docs/deploy.md", "infra/aws/**", ".github/workflows/deploy-aws.yml", "docs/deploy-aws.md"]
tests: ["e2e/smoke.spec.ts"]
diagrams: ["docs/diagrams/deployment.mmd", "docs/diagrams/deployment-aws.mmd"]
---

**Mục đích:** đưa hệ thống lên máy chủ thật để người dùng và kỹ thuật viên dùng thử (nội dung 6 của phiếu), bằng một lệnh và không cần cài Node hay Postgres trên máy chủ.

**Mô tả (theo `infra/docker-compose.prod.yml`, dự án `pcbuilder-prod`):** năm dịch vụ trên một mạng nội bộ `internal`.
- **caddy** (`caddy:2-alpine`) là dịch vụ duy nhất mở cổng 80 và 443; tự xin và gia hạn chứng chỉ HTTPS Let's Encrypt cho `DOMAIN`. `Caddyfile` chuyển `/api/*` tới `api:4000` với `flush_interval -1` (để luồng SSE của chatbot không bị đệm) và mọi đường dẫn khác tới `web:3000`. Nén `zstd/gzip` chỉ áp cho JSON ở nhánh `/api/*` (nén `text/event-stream` khiến bộ nén đệm luồng SSE) và cho toàn bộ nhánh web. Web và API dùng chung một tên miền nên cookie `Secure; SameSite=Lax` hoạt động như cùng một site.
- **api** (Node 22 alpine, build nhiều giai đoạn bằng `pnpm deploy --prod`, 257 MB) chạy bằng người dùng `node`, có HEALTHCHECK `/api/health`, tự chạy migration (`src/db/migrate.ts`) rồi mới mở server. Migrator không có advisory lock nên chỉ chạy đúng 1 replica.
- **web** (Next.js `standalone`, 223 MB, người dùng không phải root) với `NEXT_PUBLIC_API_URL` được nhúng lúc build từ `DOMAIN`, nên đổi tên miền phải build lại web. Khi render phía server, web gọi API qua mạng nội bộ (`API_INTERNAL_URL=http://api:4000/api`) vì từ trong container không với tới URL công khai.
- **postgres:16** và **redis:7** (bật AOF) chỉ nằm trong mạng nội bộ, không mở cổng ra ngoài; dữ liệu ở volume `pgdata`, `redisdata`.
- Cấu hình qua `infra/.env.prod` (mẫu `.env.prod.example`, bị gitignore). API production từ chối khởi động (fail-closed) nếu `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` hoặc `SEPAY_API_KEY` ngắn hơn 32 ký tự hoặc bắt đầu bằng `dev-`/`change-me`, hoặc `VIETQR_ACCOUNT_NO` còn là `0000000000`. Seed ở production bắt buộc `SEED_ADMIN_PASSWORD` (≥ 12 ký tự) cho `admin@pcbuilder.vn` và chỉ tạo tài khoản demo nhân viên/khách khi `SEED_DEMO_USERS=1`; đổi mật khẩu qua trang Tài khoản (`POST /api/auth/password`). Bản dev chỉ chạy postgres và redis bằng `infra/docker-compose.yml`.
- `docs/deploy.md` (tiếng Việt) hướng dẫn trên Ubuntu 22.04/24.04: yêu cầu VPS, secret, khởi chạy, nạp seed thủ công một lần (seed xóa dữ liệu cũ), xin khóa Gemini, cấu hình webhook SePay `https://<DOMAIN>/api/payments/webhook/sepay` với `Authorization: Apikey <khóa>`, sao lưu `pg_dump` bằng cron.

**Bản AWS (ADR-023):** web và API là hai container trong một task ECS Fargate ARM64, nằm sau một ALB nội bộ. Đường vào duy nhất là CloudFront qua VPC origin, nên web và API dùng chung một tên miền và cookie giữ nguyên. Dữ liệu ở RDS PostgreSQL 16 và ElastiCache Valkey (subnet riêng, mã hoá, TLS). Hạ tầng dựng bằng Terraform (`infra/aws/terraform`). Image build arm64 trên GitHub Actions, đẩy vào ECR (tag là commit SHA), deploy bằng `scripts/ecs-deploy.sh` (rolling, có circuit breaker). Không có khoá AWS dài hạn: CI dùng OIDC, người vận hành dùng SSO có MFA. Khoá ứng dụng nằm trong Parameter Store và được ECS nạp vào lúc task khởi động. API đọc `TRUST_PROXY_HOPS=2` để giới hạn tần suất theo IP thật của khách. Kế hoạch setup, cách thêm tài khoản AWS cá nhân bên cạnh tài khoản công ty, và bảng rủi ro khoá ở `docs/deploy-aws.md`.

**Kiểm chứng đã làm (báo cáo task 12):** chạy toàn bộ stack production trên máy dev ở cổng 8081/8443: cả năm dịch vụ khỏe, `GET /api/health` qua Caddy trả `{"status":"ok","db":"up","redis":"up","ai":"fallback"}`, cookie đặt `Secure; SameSite=Lax`, trang chủ trả 200, đăng nhập tài khoản mẫu qua Caddy 200, các container chạy uid 1000.

**Chưa kiểm chứng (nêu trong báo cáo):** cấp chứng chỉ Let's Encrypt thật (cần tên miền công khai), luồng SSE đi xuyên Caddy đầu-cuối, và webhook SePay thật; ba mục này thuộc phần kiểm thử QA và triển khai trên VPS.
