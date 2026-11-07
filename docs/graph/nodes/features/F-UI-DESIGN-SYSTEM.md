---
id: F-UI-DESIGN-SYSTEM
type: feature
title: "Hệ thống thiết kế \"Tech Workshop\" và các thành phần giao diện"
status: done
chapters: ["CH4"]
links:
  realizes: ["NFR-06"]
  dependsOn: ["M-WEB"]
code: ["apps/web/src/components/ui/**", "apps/web/src/app/globals.css"]
tests: []
diagrams: []
---

**Mục đích:** giao diện nhất quán, dễ đọc thông số kỹ thuật, tiếng Việt chuẩn.

**Mô tả:** token Tailwind v4 `@theme` (màu ngữ nghĩa bg/surface/fg/muted/accent/ok/warn/danger, bo góc 8/12/16, khoảng cách 4-pt, 2 cấp bóng, sáng/tối). Nền tối than chì cho khu Advisor/Builder, nền sáng cho storefront. Accent Electric Cyan `#22D3EE`, Signal Lime `#A3E635`, cảnh báo Amber `#F59E0B`, xung đột Red `#EF4444`. Font Be Vietnam Pro (UI) và JetBrains Mono (thông số, giá). Thành phần: ProductCard, SpecTable, PriceTag, CompatibilityBadge, BuildSlot, PartPicker, BuildSummaryBar, BuildCard, ChatMessage, AllocationBar, PerfMeter, VietQRPanel, OrderTimeline, DynamicSpecForm, WeightMatrixEditor. Chuẩn chất lượng: 360-1440 px, WCAG AA, focus ring rõ, `prefers-reduced-motion`.
