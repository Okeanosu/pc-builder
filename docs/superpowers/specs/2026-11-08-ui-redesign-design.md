# UI redesign: "Bench" (2026-11-08)

## Why

The first design ("Tech Workshop": graphite surfaces, a single cyan accent, dot-grid mat, monospace
data labels, silkscreen designators like `PCIE_X16`, numbered "how it works" steps, a three-card
"why us" block) reads as machine-generated: near-black + one bright accent, mono for small labels,
uppercase tracked eyebrows and identical rounded cards are the current tells of generated pages.
The owner asked for a site that looks modern and technical without looking AI-made, referencing
real modern design.

## References actually looked at (screenshots in `.playwright-mcp/ref-*.png`, not committed)

- **teenage.engineering/store** — flat light-grey product plates with no border or shadow, name
  and price as plain text under the plate, category filter as a row of text links with the
  active one in ink and the rest muted, product count right-aligned. Calm, confident, no chrome.
- **linear.app** — the product itself is the hero (a real screen, not an illustration), very large
  tight headline, near-monochrome UI, one pill CTA.
- frame.work and nothing.tech were blocked by bot protection/cookie walls; nzxt.com did not render.

## Direction

A bright workbench under a lamp: white and cool light grey, black ink, hairline rules, precise
tabular numbers. The only chroma comes from data: the eight category colours that show how a
budget is split between CPU, mainboard, RAM, GPU, storage, PSU, case and cooler. The memorable
element is the **build sheet**: an itemised parts list whose prices add up to the total, with the
eight-colour allocation bar on top. It appears as the home hero (real engine output, not a mock)
and is the same object in the advisor, the customizer and saved builds.

### Tokens

Light (default):

| token | value | use |
|---|---|---|
| bg | `#FFFFFF` | page |
| surface | `#FFFFFF` | panels on the page (separated by rules, not shadows) |
| surface-2 | `#F1F2F3` | product plates, grouped rows, inputs at rest |
| surface-3 | `#E6E8EA` | hover/pressed fill |
| border | `#E3E5E8` | hairlines |
| border-strong | `#8A9097` | input outlines, dividers that must pass 3:1 |
| fg | `#000000` | ink |
| muted | `#5F656C` | secondary text (≥ 4.5:1 on white and on surface-2) |
| accent | `#000000` | the one action colour: black pill buttons, active tab, selected outline |
| accent-fg | `#FFFFFF` | text on accent |
| accent-ink | `#000000` | links (underlined) |
| ok / warn / danger | `#1F8A4C` / `#D97706` / `#DC2626` | status marks; `*-ink` darker for text |

Dark mirrors it: page `#000000`, plates `#17181A`, rules `#2A2C2F`, ink `#FFFFFF`, accent white
with black text. The eight category colours are unchanged (already validated on both).

### Type

- **Archivo** (variable, `wght` + `wdth`, Vietnamese subset) for everything.
- Display: `font-stretch: 125%` (Tailwind `font-stretch-expanded`), weight 700, tight tracking,
  line-height ≥ 1.1 so stacked Vietnamese diacritics never collide. Used for page titles and the
  home headline only.
- Body: normal width, 400/500, 16/24.
- Numbers (prices, counts, scores, wattage): `tabular-nums` in Archivo. **No monospace for data.**
  Monospace (JetBrains Mono) stays only for things a person copies or reads as code: bank transfer
  content, tool names/JSON in the admin chat log, formula snippets.
- No uppercase labels, no tracked-out eyebrows, no single highlighted word in a headline.

### Shape and depth

- Actions are pills (`rounded-full`); fields and plates are 6px (`rounded-sm`); panels have no
  radius and are separated by `border-border` hairlines and space.
- No shadows except overlays (dialog, drawer, popover). No gradients, glows, dot grids or LEDs.
- Motion only answers an action (open, expand, confirm). The one orchestrated moment is the hero
  sheet's rows filling in when its example changes.

### Layout

- Left-aligned, `max-w-7xl`, 16px phone gutter, 24px desktop.
- Product grids: plate + text, no card frame (teenage engineering). Hover darkens the plate
  slightly and underlines the name.
- Category navigation on listing pages: a row of text links with counts, active one in ink.

```
Home (1440)
┌───────────────────────────────────────────────────────────────────────────┐
│ PC Builder ▮▮▮▮▮▮▮▮   Linh kiện  Tự build  Tư vấn AI      [Tìm…]  Giỏ  Đăng nhập │
├───────────────────────────────────────────────────────────────────────────┤
│ Cấu hình đúng nhu cầu,          │ Chơi game 25 triệu │ Đồ họa 40 │ AI 60 │ VP 12 │
│ đúng ngân sách.  (expanded)     │ ███████████▓▓▓▓░░░  allocation bar           │
│                                 │ CPU      Intel Core i5-12400     3.190.000   │
│ [ Kể nhu cầu của bạn…   Hỏi AI ]│ GPU      Radeon RX 7900 GRE     14.190.000   │
│ Tự chọn từng linh kiện          │ … 8 rows                                     │
│                                 │ Tổng                            24.920.000 ₫ │
│                                 │ 1.883 phương án đã xét trong 15 ms           │
├───────────────────────────────────────────────────────────────────────────┤
│ CPU  Mainboard  RAM  Card đồ họa  Ổ cứng  Nguồn  Vỏ case  Tản nhiệt         │
│ [plate][plate][plate][plate]   name / price under each                      │
└───────────────────────────────────────────────────────────────────────────┘
```

### Principles

1. Data is the decoration: colour only where it encodes a category's share of money or a status.
2. One build sheet everywhere a build is shown: category, part, price, running total.
3. Black means "do it": one primary style; everything else is text, outline or ghost.
4. Nothing ornamental: no eyebrow badges, numbered steps, feature-card triplets or illustrations
   standing in for content.

## Scope

- Tokens, fonts and base styles (`globals.css`, root layout).
- Shared components: `components/ui/*`, `components/layout/*`, `components/domain/*`.
- Storefront: home (new hero with live sample builds fetched server-side and cached), category,
  product, search, cart, checkout, payment, account, auth.
- Advisor (chat + form + compare) and Customizer: drop the forced-dark "workshop" surface, follow
  the site theme; designators (`CPU1`, `PCIE_X16`) replaced by category names.
- Admin: inherits tokens; mono-for-data swept.
- Copy and behaviour unchanged except removed decorative sections (hero steps, "Vì sao chọn chúng
  tôi"); the one-line honesty note ("Linh kiện và giá do hệ thống lấy từ kho…") moves under the
  hero sheet. Accessible names used by tests (e.g. "Hỏi AI tư vấn") are kept.

## Non-goals

- No new UI library, no layout framework change, no new pages, no API changes.
- No product photography (seed data has none); category drawings stay, restyled as quiet
  technical line drawings on the plate.

## Done when

- `pnpm typecheck`, `pnpm lint`, web unit tests and the E2E suite pass.
- Screenshots at 1440 and 375, light and dark, for home, advisor result, customizer, category,
  product, cart, payment and admin dashboard are reviewed and stored under
  `docs/design/screenshots/v2/`.
- `docs/design/ui-ux.md` describes the new system; an ADR node records the decision.
