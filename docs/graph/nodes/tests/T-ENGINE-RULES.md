---
id: T-ENGINE-RULES
type: test
title: "Unit test các luật tương thích C01-C14"
status: planned
chapters: ["CH4"]
links:
  verifies: ["F-COMPAT-CHECK", "NFR-08", "R-C01", "R-C02", "R-C03", "R-C04", "R-C05", "R-C06", "R-C07", "R-C08", "R-C09", "R-C10", "R-C11", "R-C12", "R-C13", "R-C14"]
code: []
tests: ["packages/engine/src/rules/**/*.test.ts"]
diagrams: []
---

**Công cụ:** Vitest. **Phạm vi:** mỗi luật có ca đúng, ca sai và ca biên (bằng đúng ngưỡng); kiểm tra thông điệp và danh mục liên quan; kiểm tra tính công suất của C08. **Mục tiêu:** góp phần đạt tối thiểu 90% branch coverage cho `packages/engine`.
