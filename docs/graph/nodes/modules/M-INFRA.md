---
id: M-INFRA
type: module
title: "Hạ tầng phát triển: Docker Compose Postgres và Redis"
status: done
chapters: ["CH4"]
links:
  decidedBy: ["ADR-001"]
code: ["infra/docker-compose.yml", "infra/postgres-init/**"]
tests: ["apps/api/src/app.test.ts"]
diagrams: []
---

`infra/docker-compose.yml` (project `pcbuilder`) chạy `postgres:16-alpine` (cổng 5433, user/pass `pc`, DB `pcbuilder`, volume `pgdata`, healthcheck `pg_isready`) và `redis:7-alpine` (cổng 6380). Script khởi tạo `postgres-init/01-test-db.sql` tạo thêm DB `pcbuilder_test` cho integration test. Test `app.test.ts` chạy với hạ tầng này.
