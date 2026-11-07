---
id: M-WEB-STATE
type: module
title: "Kho trạng thái phía web (Zustand) và TanStack Query"
status: done
chapters: ["CH4"]
links:
  dependsOn: ["M-SHARED", "M-ENGINE"]
code: ["apps/web/src/stores/**"]
tests: ["apps/web/src/stores/**/*.test.ts"]
diagrams: []
---

Bốn store: `useBuilderStore` (8 slot, kiểm tra tương thích bằng luật của `@pc/engine`), `useCartStore` (đồng bộ với server), `useChatStore` (tin nhắn, streaming, cấu hình hiện tại), `useAuthStore`. TanStack Query cho dữ liệu server.
