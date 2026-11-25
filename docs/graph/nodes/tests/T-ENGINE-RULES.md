---
id: T-ENGINE-RULES
type: test
title: "Unit test các luật tương thích C01-C15"
status: done
chapters: ["CH4"]
links:
  verifies: ["F-COMPAT-CHECK", "NFR-08", "R-C01", "R-C02", "R-C03", "R-C04", "R-C05", "R-C06", "R-C07", "R-C08", "R-C09", "R-C10", "R-C11", "R-C12", "R-C13", "R-C14", "R-C15"]
code: []
tests: ["packages/engine/src/rules.test.ts"]
diagrams: []
---

**Công cụ:** Vitest (`pnpm --filter @pc/engine test`). **Phạm vi:** `rules.test.ts` có 61 ca; mỗi luật C01–C15 một khối `describe` với ca đúng, ca sai và ca biên (bằng đúng ngưỡng); kiểm tra mã luật, mức độ (lỗi/cảnh báo), thông điệp tiếng Việt và danh mục liên quan; công suất ước tính của C08; cấu hình đầy đủ hợp lệ không sinh vấn đề nào.

**Kết quả (2026-11-08, Node v22.20.0):** cả gói Engine 9 tệp / 175 ca đạt; độ phủ nhánh toàn gói 98,85% (ngưỡng cấu hình 90%). Chi tiết ở `docs/testing/test-report.md`.
