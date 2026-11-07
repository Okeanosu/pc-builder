---
id: M-WEB
type: module
title: "Ứng dụng web Next.js: storefront, advisor, builder, admin"
status: planned
chapters: ["CH4"]
links:
  dependsOn: ["M-SHARED", "M-ENGINE", "M-WEB-STATE"]
  decidedBy: ["ADR-001"]
code: ["apps/web/src/**"]
tests: ["apps/web/src/**/*.test.ts", "apps/web/src/**/*.test.tsx"]
diagrams: []
---

Next.js 16 (App Router), TypeScript, Tailwind v4. Trang SEO (trang chủ, chi tiết sản phẩm, cấu hình chia sẻ) render phía server; Advisor, Builder, giỏ, thanh toán và admin render phía client. API client có kiểu từ @pc/shared; SSE đọc bằng `fetch` + `ReadableStream`.
