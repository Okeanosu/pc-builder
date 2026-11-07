# UI/UX — Hệ thống thiết kế "Tech Workshop"

> Phạm vi: `apps/web` (Next.js 16, Tailwind v4). Tài liệu này là nguồn tham chiếu cho các agent Frontend khi dựng trang.
> Xem trực tiếp mọi thành phần ở cả hai giao diện tại **`/design`** (route group `(dev)`, `noindex`). Trang chỉ mở ở `next dev`;
> bản build production trả 404 trừ khi build với `NEXT_PUBLIC_SHOW_DESIGN=1`.
> Ảnh chụp: `docs/design/screenshots/`.

## 1. Ý tưởng

Người dùng phổ thông sợ chọn sai linh kiện. Giao diện phải làm họ thấy **có người trong nghề đang lắp máy giúp mình**.
Hình ảnh lấy từ chính bàn lắp ráp PC:

| Chất liệu thật                                   | Thành phần giao diện                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Tấm thảm chống tĩnh điện than chì có lưới chấm   | `WorkshopSurface` / utility `workshop-mat` cho AI tư vấn và Tự build PC       |
| Vỏ nhôm, tờ thông số                             | Nền sáng của cửa hàng (`--color-bg #edf0f2`) để đọc thông số dễ               |
| Chữ in lụa trên mainboard (`CPU1`, `PCIE_X16`)   | Ký hiệu khe (`CATEGORY_DESIGNATOR`) trên ảnh minh họa và slot của Builder     |
| Đèn LED trạng thái                               | `CompatibilityBadge`, `PerfMeter` (thanh LED 20 vạch, phát sáng trên nền tối) |
| Chân cắm trống trên bo mạch                      | `EmptyState`: biểu tượng nằm trong khung nét đứt                              |
| Bản vẽ kỹ thuật                                  | `ProductImage` khi chưa có ảnh: bản vẽ nét theo từng danh mục                 |
| Phím bấm                                         | Nút chính có gờ dưới (inset shadow), nhấn xuống 1 px                          |

**Điểm nhấn duy nhất:** khu Workshop than chì. Phần còn lại (cửa hàng, admin) giữ yên, kỷ luật, để thông số và giá nổi lên.

## 2. Nguyên tắc

1. **Token trước, màu sau.** Thành phần chỉ dùng token ngữ nghĩa (`bg-surface`, `text-muted`, `border-border-strong`…). Bảng màu mặc định của Tailwind đã bị tắt (`--color-*: initial`) để không ai dùng `bg-red-500`.
2. **Màu có nghĩa cố định.** Cyan = hành động. Lime = _chỉ_ "tương thích". Amber = cảnh báo. Đỏ = xung đột. Màu trạng thái luôn đi kèm biểu tượng + chữ, không bao giờ chỉ là màu.
3. **Số liệu dùng mono.** Giá, thông số, mã luật (C01–C14) dùng JetBrains Mono với `tabular-nums`; chữ giao diện dùng Be Vietnam Pro.
4. **Workshop bám theo bề mặt, không theo trang.** AI tư vấn / Builder luôn tối kể cả khi site sáng; lớp phủ mở từ đó (ngăn chọn linh kiện, tooltip) cũng tối nhờ `ThemeScope` cung cấp portal container.
5. **Chuyển động chỉ để chỉ ra điều vừa thay đổi.** Một khoảnh khắc dàn dựng duy nhất (3 BuildCard trượt vào, thanh phân bổ chạy, LED sáng dần). Mọi animation tắt theo `prefers-reduced-motion`.
6. **Lỗi và trạng thái trống luôn chỉ đường.** Nói sai gì và làm gì tiếp; không xin lỗi, không "Không có dữ liệu".
7. **Copy tiếng Việt, câu thường (sentence case), động từ rõ.** Nút nói đúng việc sẽ xảy ra: "Thêm vào giỏ", "Mở trong Customizer", "Xóa cấu hình".

## 3. Tokens

Định nghĩa trong `apps/web/src/app/globals.css` (`@theme static`). Giá trị sáng nằm trong `@theme` và `[data-theme="light"]`; giá trị tối nằm trong `[data-theme="dark"], .workshop`.

### 3.1 Màu ngữ nghĩa

| Token (`--color-*`) | Sáng      | Tối       | Dùng cho                                         | Utility ví dụ           |
| ------------------- | --------- | --------- | ------------------------------------------------ | ----------------------- |
| `bg`                | `#edf0f2` | `#12161b` | Nền trang                                        | `bg-bg`                 |
| `surface`           | `#ffffff` | `#191e24` | Thẻ, bảng, header                                | `bg-surface`            |
| `surface-2`         | `#f4f6f8` | `#20262e` | Nền phụ, hover, chip                             | `bg-surface-2`          |
| `surface-3`         | `#e4e8ec` | `#29313a` | Rãnh thanh đo, skeleton                          | `bg-surface-3`          |
| `border`            | `#d5dbe0` | `#2c343e` | Đường chia trang trí                             | `border-border`         |
| `border-strong`     | `#87929c` | `#5f6c7a` | Viền ô nhập, checkbox (≥ 3:1)                    | `border-border-strong`  |
| `fg`                | `#141a20` | `#e8edf2` | Chữ chính                                        | `text-fg`               |
| `muted`             | `#56616c` | `#97a3b0` | Chữ phụ, placeholder (≥ 4.5:1)                   | `text-muted`            |
| `accent`            | `#22d3ee` | `#22d3ee` | **Electric Cyan** — nền nút chính, vạch LED      | `bg-accent`             |
| `accent-hover`      | `#06b6d4` | `#67e8f9` | Hover nút chính                                  | `hover:bg-accent-hover` |
| `accent-fg`         | `#0b1d22` | `#0b1d22` | Chữ trên mọi nền tín hiệu (cyan/lime/amber/đỏ)   | `text-accent-fg`        |
| `accent-ink`        | `#0e7490` | `#22d3ee` | Liên kết, chữ nhấn                               | `text-accent-ink`       |
| `ring`              | `#0891b2` | `#22d3ee` | Vòng focus                                       | `focus-ring`            |
| `ok` / `ok-ink`     | `#a3e635` / `#3f6212` | `#a3e635` / `#a3e635` | **Signal Lime** — tương thích | `bg-ok/16 text-ok-ink` |
| `warn` / `warn-ink` | `#f59e0b` / `#9a4a07` | `#f59e0b` / `#fbbf24` | **Amber** — cảnh báo          | `bg-warn/14 text-warn-ink` |
| `danger` / `danger-ink` | `#ef4444` / `#c81e1e` | `#ef4444` / `#f87171` | **Red** — xung đột        | `bg-danger/12 text-danger-ink` |
| `scrim`             | `rgb(10 13 17 / .56)` | như sáng | Lớp phủ sau dialog/drawer           | `bg-scrim`              |

Quy tắc: `*-ink` dùng cho **chữ/biểu tượng**, màu gốc (`ok`, `warn`, `danger`, `accent`) dùng cho **nền/viền/vạch**.

Bảng màu thô (để dùng hiếm hoi, ví dụ nút luôn tối): `graphite-950…100`, `aluminum-50…700`, `cyan`, `lime`, `amber`, `red`, `ink`.

### 3.2 Màu nhận diện danh mục

Dùng cho vạch `AllocationBar`, ô màu chú thích, chi tiết bản vẽ `ProductImage`. **Không dùng cho chữ.** Một bộ cho cả hai giao diện,
đã kiểm bằng validator dataviz trên nền `#ffffff` và `#191e24`: thứ tự liền kề ΔE (CVD) tối thiểu 15,7, ΔE thường ≥ 15.

| Danh mục  | Token                  | Hex       | Danh mục  | Token                | Hex       |
| --------- | ---------------------- | --------- | --------- | -------------------- | --------- |
| CPU       | `--color-cat-cpu`      | `#2a78d6` | Ổ cứng    | `--color-cat-storage`| `#a35ce0` |
| Mainboard | `--color-cat-mainboard`| `#14a38b` | Nguồn     | `--color-cat-psu`    | `#c0713a` |
| RAM       | `--color-cat-ram`      | `#8b7cf0` | Vỏ case   | `--color-cat-case`   | `#5b5fe0` |
| Card đồ họa | `--color-cat-gpu`    | `#d55181` | Tản nhiệt | `--color-cat-cooler` | `#0e9fb8` |

Tránh xanh lá/amber/đỏ để không lẫn với màu trạng thái. Trong code: `CATEGORY_COLOR[key]` (`components/domain/category.ts`).

### 3.3 Chữ

| Cỡ  | Utility     | Line-height | Tracking | Dùng cho                         |
| --- | ----------- | ----------- | -------- | -------------------------------- |
| 48  | `text-3xl`  | 56          | -0.03em  | Hero trang chủ                   |
| 32  | `text-2xl`  | 40          | -0.02em  | Tiêu đề trang                    |
| 24  | `text-xl`   | 32          | -0.01em  | Tiêu đề khối, giá tổng           |
| 20  | `text-lg`   | 28          |          | Tiêu đề thẻ, dialog              |
| 16  | `text-base` | 24          |          | Nội dung, tin nhắn chat          |
| 14  | `text-sm`   | 20          |          | Nhãn, nút, bảng                  |
| 12  | `text-xs`   | 18          |          | Chú thích, badge, ký hiệu in lụa |

- `font-sans` = **Be Vietnam Pro** 400/500/600/700/800 (subset `latin` + `vietnamese`), `font-mono` = **JetBrains Mono**.
- Line-height nới cho dấu tiếng Việt chồng tầng (12px dùng 18px).
- Các cỡ ngoài thang (`text-4xl`…) đã bị bỏ.

### 3.4 Hình khối, bóng, khoảng cách, chuyển động

| Nhóm       | Token                                                      | Ghi chú                                                         |
| ---------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Bo góc     | `rounded-xs` 4 · `rounded-sm` 8 · `rounded-md` 12 · `rounded-lg` 16 | Theo cấp: badge/checkbox 4, nút/ô nhập 8, thẻ 12, dialog/panel 16. 4 px thêm vào thang 8/12/16 của spec cho phần tử lồng trong khung 8 px. |
| Bóng       | `shadow-raised`, `shadow-overlay`                           | Chỉ 2 mức, giá trị riêng cho sáng/tối. Thẻ thường dùng viền.    |
| Khoảng cách| lưới 4 px (`--spacing: 0.25rem` mặc định của Tailwind)      | 4, 8, 12, 16, 24, 32, 48, 64                                    |
| Easing     | `--ease-out` `cubic-bezier(.22,1,.36,1)`, `--ease-in`       |                                                                 |
| Animation  | `animate-card-in`, `animate-wipe-in`, `animate-led-on`, `animate-caret`, `animate-blink-dot`, `animate-shimmer`, dialog/sheet/toast in-out | Dùng `style={{ animationDelay }}` để so le. |
| LED        | `--led-glow` (filter), `--led-shadow`                       | `none` trên nền sáng, phát sáng trên nền tối.                   |

Utilities riêng: `focus-ring` (outline 2 px + offset 2 px), `workshop-mat` (lưới chấm 24 px + kẻ 120 px), `no-scrollbar`.

## 4. Cơ chế giao diện sáng / tối / Workshop

- `<html data-theme="light|dark">`. Script inline trong `<head>` (`components/layout/theme-script.ts`) đọc `localStorage.theme`
  (`light` | `dark` | không có = theo hệ thống) và đặt `data-theme` trước lần vẽ đầu → không nhấp nháy, trang vẫn prerender tĩnh.
- `ThemeToggle` (`variant="icon"` cho header, `"segmented"` cho footer) ghi lựa chọn, nghe `prefers-color-scheme` khi ở chế độ hệ thống.
  Hook `useThemePreference()` / hàm `setThemePreference()` dùng lại được.
- **Workshop:** `<WorkshopSurface>` (hoặc class `.workshop`) đặt token tối cho cả cây con. Advisor/Builder bọc nội dung chính trong nó.
- **ThemeScope + portal:** `ThemeScope` cung cấp phần tử làm `container` cho Radix Portal. `Dialog`, `Drawer`, `Select`, `Tooltip`
  tự đọc qua `usePortalContainer()` → `PartPicker` mở từ Builder tối sẽ tối dù site sáng.
- Biến thể `dark:` của Tailwind khớp scope gần nhất (`[data-theme=dark]`, `.workshop`) nhưng **ưu tiên token** thay cho `dark:`.

## 5. Danh mục thành phần

Import từ `@/components/ui/*`, `@/components/domain/*`, `@/components/layout/*`. Helper: `cn()` (`@/lib/cn`), định dạng (`@/lib/format`:
`formatVnd`, `formatVndShort` re-export từ `@pc/shared`, thêm `formatPercent`, `formatCapacityGB`, `formatSpecValue`, `formatKeySpec`).

### 5.1 Primitive (`components/ui`)

| Thành phần | API chính | Trạng thái |
| --- | --- | --- |
| `Button` | `variant`: primary · secondary · outline · ghost · danger · workshop · link; `size`: sm 32 · md 40 · lg 48 · icon · icon-sm; `loading`; `asChild` | default, hover, active (lún 1 px), focus-visible, disabled, loading (spinner + `aria-busy`) |
| `Input`, `Textarea`, `Field`, `Label` | `Input`: `leading`, `trailing`, `mono`, `invalid`, `size`; `Field`: `label`, `hint`, `error`, `required` (tự nối `id`, `aria-describedby`, `aria-invalid`) | default, focus, invalid (viền đỏ + thông báo), disabled |
| `Select` | `options[]`, `placeholder`, `value/defaultValue`, `onValueChange`, `size`, `invalid` (Radix) | closed, open, item highlighted/checked/disabled, placeholder, invalid, disabled |
| `Checkbox` | `label`, `description`, `meta` (số lượng facet), `checked` gồm `"indeterminate"` | unchecked, checked, indeterminate, disabled, focus |
| `Badge` | `tone`: neutral · accent · ok · warn · danger · solid · outline; `size` sm/md; `mono` | — |
| `Card` (+ `CardHeader/Title/Description/Content/Footer`) | `variant`: default · inset · interactive · selected | hover/focus-within (interactive), selected |
| `Dialog` (+ `DialogTrigger/Content/Body/Footer/Close`) | `DialogContent`: **`title` bắt buộc**, `description?`, `hideTitle?` (chỉ cho trình đọc màn hình), `size` sm/md/lg, `hideClose`. Tiêu đề do `DialogContent` tự vẽ nên không thể thiếu hay bị lặp | open/closed (animation), focus trap, Esc |
| `Drawer` (+ `DrawerTrigger/Content/Body/Footer/Close`) | `DrawerContent`: **`title` bắt buộc**, `description?`, `hideTitle?`, `side`: responsive (mặc định: bottom sheet < 640 px, panel phải ≥ 640 px) · right · left · bottom | open/closed |
| `Tabs` (+ `TabsList/Trigger/Content`) | `variant`: segmented · line | active, hover, focus, disabled; tràn → cuộn ngang |
| `Tooltip` | `content`, `side`, `open`/`defaultOpen` | delayed/instant open, closed |
| `Skeleton`, `SkeletonText` | kích thước qua `className` | shimmer (tĩnh khi reduced-motion) |
| `Toast` → `toast({ title, description, tone, action, duration })`, `<Toaster/>` (đã gắn ở root layout) | `tone`: info · success · warning · error | vào/ra, vuốt để đóng, lỗi giữ 8 s |
| `Price` | `amount`, `size` sm…2xl, `tone`: default · muted · strike · accent | — |
| `Spinner` | `size`, `label` (`null` khi cha đã báo bận) | — |
| `EmptyState` | `icon`, `title`, `description`, `actions`, `tone`: empty · error, `compact` | empty, no-results, error (`role="alert"`) |
| `ThemeScope` | `theme`, `workshop` | — |

### 5.2 Nghiệp vụ (`components/domain`)

| Thành phần | Props (theo DTO `@pc/shared`) | Trạng thái / ghi chú |
| --- | --- | --- |
| `CompatibilityBadge` | `issues?: CompatibilityIssueDTO[]`, `status?`, `size`, `label?`, `tooltipOpen?`; helper `getCompatibilityStatus()` | ok "Tương thích" · warning "Cảnh báo" / "N cảnh báo" · error "Xung đột" / "N xung đột"; tooltip liệt kê mã luật C01–C14 + thông điệp, lỗi trước cảnh báo |
| `PriceTag` | `price`, `salePrice?`, `size` sm/md/lg, `layout` stacked/inline; helper `discountPercent()` | giá thường; khuyến mãi = giá mới + giá gốc gạch + badge `-N%` |
| `SpecTable` | `fields: SpecField[]`, `specs`, `highlight?: {key: 'warning'|'error'}`, `showEmpty`, `dense`, `caption` | dòng xung đột/cảnh báo tô nền + biểu tượng + chữ ẩn cho trình đọc màn hình |
| `AllocationBar` | `allocation` (0..1, `BuildDTO.allocation`), `amounts?`, `total?`, `legend` full/compact/none, `size`, `animate` | chạy trái→phải khi mount; đổi tỉ lệ thì vạch co giãn mượt (500 ms); hover vạch/chú thích làm mờ phần còn lại; `role="img"` + `aria-label` tóm tắt |
| `PerfMeter` | `score` 0–100, `label`, `caption`, `size` sm/md, `animate`; helper `perfTier()` | bậc: Cơ bản < 40 ≤ Phổ thông < 60 ≤ Khá < 75 ≤ Mạnh < 90 ≤ Rất mạnh; `role="meter"` |
| `ProductImage` | `src?`, `alt`, `category`, `designator`, `sizes`, `priority` | có ảnh → `next/image`; không ảnh → bản vẽ kỹ thuật SVG theo danh mục + ký hiệu in lụa (ẩn khi ô < 176 px) |
| `ProductCard` | `product: ProductSummaryDTO`, `href?` (mặc định `/p/{slug}`), `action?` (slot nút), `variant` grid/list, `maxSpecs` | còn hàng / "Chỉ còn N" (≤ 5) / hết hàng (chỉ làm mờ ảnh, chữ giữ nguyên độ tương phản); cả thẻ bấm được, `action` nằm trên link; `list` tự xếp lại theo bề rộng khung (container query) |
| `CategoryIllustration` | `category` | dùng lẻ cho slot trống của Builder |
| `category.ts` | `CATEGORY_COLOR`, `CATEGORY_DESIGNATOR` (`CPU1`, `MB1`, `DIMM_A1`, `PCIE_X16`, `M2_1`, `ATX_PWR`, `CHASSIS`, `CPU_FAN`) | |

### 5.3 Bố cục (`components/layout`)

| Thành phần | Props | Ghi chú |
| --- | --- | --- |
| `SiteHeader` | `cartCount`, `categories?` (mặc định 8 danh mục → `/c/{key}`), `activeCategory?`, `accountSlot?`, `searchAction` (mặc định `/search`, tham số `q`), `searchDefaultValue` | Logo, ô tìm kiếm, nút **AI tư vấn cấu hình** (biến thể workshop, đèn LED nhấp nháy chậm), đổi giao diện, giỏ hàng có số, tài khoản; hàng danh mục cuộn ngang + "Tự build PC". Mobile: logo thu gọn, ô tìm kiếm xuống dòng. |
| `SiteFooter` | `categories?`, `note?` | 3 cột liên kết + ThemeToggle segmented |
| `AdminShell` | `title`, `actions`, `user`, `activeHref?`, `embedded?` | Sidebar than chì (Tổng quan, Sản phẩm, Tồn kho, Benchmark, Trọng số thuật toán, Đơn hàng, Hội thoại AI) + topbar; mobile: menu mở drawer trái. `usePathname` nằm sau `Suspense` riêng vì route admin có tham số động. Danh sách mục nằm ở `admin-nav.ts` (`ADMIN_NAV`, module thường để server component import được). |
| `WorkshopSurface` | `mat` (lưới chấm) | Bọc khu Advisor/Builder |
| `ThemeToggle` | `variant` icon/segmented | |
| `Logo`, `LogoMark`, `BRAND_NAME` | `href`, `compact` | Tên thương hiệu đặt một chỗ để dễ đổi |

### 5.4 Thành phần do Frontend dựng tiếp (đặc tả hình ảnh)

Bản dựng tham chiếu nằm ở mục **Bề mặt Workshop** trên `/design`.

- **ToolStatusChip:** pill cao 28, `rounded-full`; đang chạy = `border-accent/40 bg-accent/10 text-accent-ink` + `Spinner size="sm" label={null}`; xong = `bg-surface text-muted` + dấu check `text-ok-ink`. Chữ dạng "Đang chọn linh kiện trong kho…".
- **ChatMessage:** người dùng = bong bóng `bg-accent text-accent-fg rounded-md rounded-ee-xs` canh phải, tối đa `max-w-md`; trợ lý = chữ `text-fg` không bong bóng trên mat; con trỏ stream `animate-caret` vạch 2 px màu accent.
- **BuildCard:** `Card` (cấu hình đang chọn = `variant="selected"`), thứ tự: `Badge` nhãn (`BUILD_LABEL_TEXT`) + `CompatibilityBadge size="sm"` → `Price size="xl"` + "Còn dư …" → `PerfMeter size="sm"` → `AllocationBar size="sm" legend="compact"` → danh sách linh kiện (nhãn muted trái, tên phải) → `Button` "Mở trong Customizer" + nút icon giỏ. Vào cảnh: `animate-card-in` so le 110 ms.
- **BuildSlot:** khung nét đứt như `EmptyState` khi trống, ký hiệu in lụa `CATEGORY_DESIGNATOR` mono `text-xs text-muted`, `CategoryIllustration` nhỏ; khi đã chọn dùng `ProductCard variant="list"`.
- **PartPicker:** `Drawer` (side mặc định responsive, `title="Chọn card đồ họa"`, `description` = số sản phẩm tương thích) + `Input` lọc + danh sách `ProductCard variant="list"` với nút "Chọn"; đặt `DrawerBody` dạng `grid content-start` (flex column sẽ ép các con co lại).
- **BuildSummaryBar:** thanh dính đáy `bg-surface/92 backdrop-blur border-t`, chứa tổng `Price size="xl"`, công suất ước tính mono, `CompatibilityBadge`.
- **VietQRPanel / OrderTimeline:** ảnh QR trên nền trắng cố định (kể cả giao diện tối) để app ngân hàng quét được; đếm ngược mono `text-2xl`; mốc thời gian dùng chấm 8 px, mốc hiện tại = accent.

## 6. Wireframe màn hình

Chú thích: `[ ]` nút, `( )` ô nhập, `▒` vùng Workshop than chì, `▮▮▮▯` PerfMeter, `■■■■` AllocationBar.

### `/` — Trang chủ (SSR)

```
┌ SiteHeader ───────────────────────────────────────────────────────────────┐
│ ◰ PC Builder  ( Tìm CPU, card đồ họa…        )  [• AI tư vấn cấu hình] ☾ 🛒3 👤│
│ CPU  Mainboard  RAM  Card đồ họa  Ổ cứng  Nguồn  Vỏ case  Tản nhiệt   🔧Tự build PC│
└───────────────────────────────────────────────────────────────────────────┘
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
▒  Nói nhu cầu, AI chọn cấu hình từ hàng có sẵn          (text-3xl, trái)   ▒
▒  ┌──────────────────────────────────────────────────────────┐            ▒
▒  │ Chơi Valorant + edit video nhẹ, tầm 25 triệu…        [→] │  ô chat lớn▒
▒  └──────────────────────────────────────────────────────────┘            ▒
▒  (Gaming 25 triệu) (Đồ họa 40 triệu) (AI 60 triệu) (Văn phòng 12 triệu)  ▒
▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
 Danh mục       [CPU1 bản vẽ][MB1][DIMM_A1][PCIE_X16][M2_1][ATX_PWR][CHASSIS][CPU_FAN]
 Cấu hình mẫu theo mục đích   ┌BuildCard┐ ┌BuildCard┐ ┌BuildCard┐ ┌BuildCard┐
 Sản phẩm nổi bật             ┌Product ┐ ┌Product ┐ ┌Product ┐ ┌Product ┐
 SiteFooter
```

Mobile: hero mat full-bleed, chip gợi ý cuộn ngang, danh mục lưới 4×2, sản phẩm 2 cột.

### `/advisor` — AI PC Advisor (CSR, toàn trang Workshop)

```
┌ SiteHeader (giữ nguyên, sáng hoặc tối theo site) ─────────────────────────┐
▒┌ Hội thoại (≈ 5/12) ─────────────┐┌ So sánh cấu hình (≈ 7/12) ─────────────┐▒
▒│        [Chơi game 2K, 25 triệu]││ [Tối ưu hiệu năng|Cân bằng|Tiết kiệm]  │▒
▒│ ✓ Đã hiểu nhu cầu               ││ ┌Hiệu năng┐┌Cân bằng ★┐┌Tiết kiệm┐     │▒
▒│ ◌ Đang chọn linh kiện trong kho…││ │24.960.000││22.480.000││19.890.000│   │▒
▒│ Cấu hình Cân bằng dồn 40% cho   ││ │88 ▮▮▮▮▮▯ ││81 ▮▮▮▮▯▯ ││72 ▮▮▮▯▯ │    │▒
▒│ card đồ họa vì…▌                ││ │■■■■■■■■  ││■■■■■■■■  ││■■■■■■■  │    │▒
▒│                                 ││ │CPU/GPU/RAM││…        ││⚠ C13    │    │▒
▒│ ( Nhập yêu cầu…            )[↑] ││ │[Mở trong Customizer][🛒]           │▒
▒│ Chế độ dự phòng (badge khi FB)  ││ └──────────┘└──────────┘└──────────┘   │▒
▒└─────────────────────────────────┘└────────────────────────────────────────┘▒
```

Mobile: một cột; BuildCard nằm ngay dưới tin nhắn trợ lý dạng carousel ngang (snap), ô nhập dính đáy.

### `/builder` — PC Customizer (CSR, Workshop)

```
▒ Tự build PC                          [Xuất báo giá PDF] [Lưu cấu hình]    ▒
▒┌ 8 slot ──────────────────────────────────────┐┌ Tổng quan (sticky) ─────┐▒
▒│ CPU1     ┌ Ryzen 5 7600X   AM5 6 nhân ┐ [Đổi] ││ ✓ Tương thích           │▒
▒│ MB1      ┌ B650M …        AM5 DDR5   ┐ [Đổi] ││ 22.480.000₫             │▒
▒│ DIMM_A1  ┌ ⚠ C02  DDR4 không hợp B650 ┐ [Đổi] ││ Công suất ~420W / PSU 650W│▒
▒│ PCIE_X16 ┌╌╌╌╌ Chưa chọn card đồ họa ╌┐ [Chọn]││ ▮▮▮▮▮▮▮▯▯ 81 Mạnh        │▒
▒│ M2_1 · ATX_PWR · CHASSIS · CPU_FAN …         ││ ■■■■■■■■ chú thích      │▒
▒└──────────────────────────────────────────────┘│ [Thêm cả bộ vào giỏ]    │▒
▒                                                 └─────────────────────────┘▒
   PartPicker = Drawer phải (bottom sheet trên mobile): ( lọc ) + bộ lọc + ProductCard list [Chọn]
```

Mobile: slot xếp dọc, Tổng quan thành `BuildSummaryBar` dính đáy (giá + badge + nút).

### `/c/[category]` — Danh sách sản phẩm

```
 SiteHeader (activeCategory)
 Card đồ họa  (text-2xl)                         128 sản phẩm   Sắp xếp [Hiệu năng ▾]
┌ Bộ lọc (từ specSchema) ┐ ┌Product┐ ┌Product┐ ┌Product┐ ┌Product┐
│ Khoảng giá ( )–( ) ₫   │ │ bản vẽ│ │       │ │       │ │       │
│ Hãng chip  ☑ NVIDIA 42 │ └───────┘ └───────┘ └───────┘ └───────┘
│            ☐ AMD    18 │ ┌Product┐ …                (4 cột ≥1280, 3 ≥1024, 2 mobile)
│ VRAM       ☐ 8GB  ☐ 16GB│
│ [Xóa bộ lọc]           │ « 1 2 3 … »
└────────────────────────┘
```

Mobile: nút "Bộ lọc (3)" mở Drawer bottom; không kết quả → `EmptyState compact` "Không có sản phẩm phù hợp" + [Xóa bộ lọc].

### `/p/[slug]` — Chi tiết sản phẩm (SSR)

```
 Trang chủ › Card đồ họa › ASUS Dual RTX 5060 Ti 16GB
┌ ProductImage 4:3 (bản vẽ hoặc ảnh) ┐  ASUS
│                                    │  ASUS Dual GeForce RTX 5060 Ti 16GB OC (text-2xl)
│         PCIE_X16                   │  [RTX 5060 Ti] [16GB VRAM] [180W]
└────────────────────────────────────┘  12.290.000₫  13.490.000₫ -9%   ● Còn hàng
                                        [🛒 Thêm vào giỏ] [Thêm vào cấu hình]
 [Thông số | Benchmark | Mô tả]  (Tabs line)
 SpecTable (fields = category.specSchema)      PerfMeter "Hiệu năng chơi game" 86 Mạnh
```

### `/checkout` — Thông tin giao hàng

```
 Thanh toán (text-2xl)
┌ Thông tin người nhận ───────────────┐ ┌ Đơn hàng ─────────────────────┐
│ Họ và tên *        ( )               │ │ Bộ PC Cân bằng ×1  22.480.000₫ │
│ Số điện thoại *    ( ) ← lỗi đỏ dưới │ │ Phí lắp ráp           200.000₫ │
│ Địa chỉ *          ( )               │ │ Phí vận chuyển        Miễn phí │
│ Ghi chú            [textarea]        │ │ ───────────────────────────── │
│ Thanh toán: chuyển khoản VietQR      │ │ Tổng            22.680.000₫   │
└──────────────────────────────────────┘ │ [Đặt hàng và lấy mã QR]       │
                                         └───────────────────────────────┘
```

### `/orders/[code]/pay` — VietQR

```
 Đơn PCB2611070042 · Chờ thanh toán (Badge warn)
┌ QR (nền trắng cố định) ┐   Số tiền       22.680.000₫   [Sao chép]
│   ▓▓ ▓ ▓▓              │   Nội dung CK   PCB2611070042 [Sao chép]
│   ▓ ▓▓▓ ▓              │   Ngân hàng     MB · 0123456789 · PC BUILDER
└────────────────────────┘   Hết hạn sau   14:32 (mono text-2xl, đếm ngược)
 ◌ Đang chờ ngân hàng xác nhận… (tự cập nhật mỗi 3 giây)     [Giả lập thanh toán] (dev)
 Thành công → EmptyState-like: ✓ "Đã nhận thanh toán" + OrderTimeline + [Xem đơn hàng]
 Hết hạn → EmptyState error "Mã QR đã hết hạn" + [Tạo lại mã thanh toán]
```

### `/admin` — Tổng quan

```
┌ Sidebar ▒ ─────────┐┌ Topbar: Tổng quan                      [Xuất báo cáo] ┐
│ ◰ PC Builder       ││ ┌Doanh thu hôm nay┐┌Đơn chờ TT┐┌Hội thoại AI┐┌Hết hàng┐ │
│   Quản trị cửa hàng││ │ 48.630.000₫     ││ 7        ││ 132        ││ 4      │ │
│ ▌Tổng quan         ││ └─────────────────┘└──────────┘└────────────┘└────────┘ │
│  Sản phẩm          ││ ┌ Doanh thu (recharts, ngày/tuần/tháng) ─────────────┐   │
│  Tồn kho           ││ │                                                     │   │
│  Benchmark         ││ └─────────────────────────────────────────────────────┘   │
│  Trọng số thuật toán││ ┌ Đơn hàng mới ─────────┐┌ Tỉ lệ chế độ dự phòng ──┐    │
│  Đơn hàng          ││ │ bảng                  ││                         │    │
│  Hội thoại AI      ││ └───────────────────────┘└─────────────────────────┘    │
│ ── Trần Minh       │└──────────────────────────────────────────────────────────┘
│ ← Về cửa hàng      │
└────────────────────┘
```

## 7. Chất lượng

| Tiêu chí | Cách đáp ứng |
| --- | --- |
| Responsive 360 → 1440 | Kiểm `/design` ở 375 và 1440: không tràn ngang (`scrollWidth == clientWidth`); thành phần nhạy bề rộng dùng container query (`ProductCard list`, `AllocationBar`, `ProductImage`) |
| WCAG AA | `fg/bg` 15,3:1 (sáng) · 15,4:1 (tối); `muted` ≥ 5,1:1 trên mọi nền; `accent-ink` 4,7:1 trên `bg` sáng; chữ trên nền tín hiệu: cyan 9,6 · lime 11,5 · amber 8,1 · đỏ 4,6; viền ô nhập ≥ 3:1; ring ≥ 3,2:1 |
| Focus | `focus-ring` trên mọi phần tử tương tác; ô nhập đổi viền sang `ring` + quầng 3 px |
| Reduced motion | khối `@media (prefers-reduced-motion: reduce)` trong `globals.css` |
| Loading / empty / error | `Skeleton`, `Spinner`, `Button loading`, `EmptyState` (3 dạng) |
| Tiền tệ | luôn `formatVnd` / `Price` → `25.000.000₫`, mono, `tabular-nums` |
| Màu không đứng một mình | trạng thái = biểu tượng + chữ; biểu đồ = chú thích + `aria-label` |

## 8. Ghi chú cho Frontend

- Bọc nội dung Advisor/Builder trong `<WorkshopSurface>`; đừng tự đặt màu tối.
- Không gọi API trong `components/layout/*`; truyền `cartCount`, `accountSlot`, `categories` từ page/layout của route group.
- `SiteHeader` gửi tìm kiếm tới `searchAction` (mặc định `/search?q=`); route này chưa có trong spec — hoặc dựng `/search`, hoặc truyền `searchAction`.
- `toast()` gọi được ở mọi client component; `<Toaster/>` đã có trong root layout.
- Muốn lớp phủ theo theme của một vùng riêng → bọc vùng đó bằng `ThemeScope`.
- Biểu đồ admin (recharts): dùng `var(--color-cat-*)` cho series theo danh mục, `var(--color-accent)` cho một series, chữ trục `var(--color-muted)`.
