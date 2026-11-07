---
id: E-CHAT-SESSION
type: entity
title: "Phiên chat"
status: done
chapters: ["CH4"]
links:
  refines: ["M-DB"]
code: ["apps/api/src/db/schema.ts"]
tests: []
diagrams: []
---

**Bảng:** `chat_sessions`

Thuộc một người dùng hoặc một khách (`guest_id`), có tiêu đề và chế độ (AI hoặc FALLBACK).
