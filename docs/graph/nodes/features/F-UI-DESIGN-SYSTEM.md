---
id: F-UI-DESIGN-SYSTEM
type: feature
title: "Hệ thống thiết kế \"Bench\" và các thành phần giao diện"
status: done
chapters: ["CH4"]
links:
  realizes: ["NFR-06"]
  dependsOn: ["M-WEB"]
code: ["apps/web/src/components/ui/**", "apps/web/src/components/domain/**", "apps/web/src/app/globals.css"]
tests: ["e2e/a11y.spec.ts"]
diagrams: []
---

**Mục đích:** giao diện nhất quán, dễ đọc thông số kỹ thuật, tiếng Việt chuẩn.

**Mô tả:** token Tailwind v4 `@theme` (màu ngữ nghĩa bg/surface/fg/muted/accent/ok/warn/danger, bo góc 3/6/8/12, khoảng cách 4-pt, không bóng đổ trừ lớp phủ, sáng/tối). Nền trắng/xám lạnh, chữ và nút chính màu mực; màu sắc chỉ đến từ 8 màu danh mục (tỷ lệ ngân sách) và màu trạng thái. Font Archivo biến thiên (tiêu đề giãn 125%, số thẳng cột cho giá và thông số), JetBrains Mono chỉ cho nội dung cần sao chép. Bản đầu "Tech Workshop" (than chì + cyan) được thay theo ADR-022. Thành phần: ProductCard, SpecTable, PriceTag, CompatibilityBadge, BuildSlot, PartPicker, BuildSummaryBar, BuildCard, ChatMessage, AllocationBar, PerfMeter, VietQRPanel, OrderTimeline, DynamicSpecForm, WeightMatrixEditor. Chuẩn chất lượng: 360-1440 px, WCAG AA, focus ring rõ, `prefers-reduced-motion`.
