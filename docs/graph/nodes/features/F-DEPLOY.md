---
id: F-DEPLOY
type: feature
title: "Đóng gói Docker và triển khai lên VPS"
status: done
chapters: ["CH4", "CH6"]
links:
  realizes: ["NFR-07"]
  dependsOn: ["M-INFRA"]
code: ["infra/docker-compose.prod.yml", "apps/api/Dockerfile", "apps/web/Dockerfile", "docs/deploy.md"]
tests: []
diagrams: ["docs/diagrams/deployment.mmd"]
---

**Mục đích:** đưa hệ thống lên máy chủ thật để người dùng và kỹ thuật viên dùng thử (nội dung 6 của phiếu).

**Mô tả:** Dockerfile nhiều giai đoạn cho api và web (Next.js standalone); `docker-compose.prod.yml` chạy web, api, postgres, redis và Caddy với HTTPS tự động; hướng dẫn triển khai trên Ubuntu VPS trong `docs/deploy.md`. Bản dev chỉ chạy postgres và redis bằng `infra/docker-compose.yml`.
