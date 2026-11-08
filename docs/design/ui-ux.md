# UI/UX — Hệ thống thiết kế "Bench"

> Bản thứ hai (2026-11-08), thay cho "Tech Workshop" (than chì + cyan). Lý do và tham khảo: ADR-022,
> đặc tả `docs/superpowers/specs/2026-11-08-ui-redesign-design.md`. Trang tham chiếu sống: `/design`
> (chỉ chạy ở môi trường dev). Ảnh chụp: `docs/design/screenshots/v2/`.

## 1. Ý tưởng

Một bàn lắp ráp dưới ánh đèn: nền trắng và xám lạnh, chữ màu mực, đường kẻ mảnh, chữ số thẳng cột.
Màu sắc **chỉ đến từ dữ liệu**: 8 màu danh mục cho biết mỗi phần ngân sách chảy vào CPU, mainboard,
RAM, card đồ họa, ổ cứng, nguồn, vỏ case hay tản nhiệt. Thứ người xem nhớ là **bảng cấu hình**: danh
sách linh kiện có giá từng dòng cộng lại thành tổng, thanh phân bổ 8 màu ở trên. Trang chủ hiển thị
kết quả thật của engine cho bốn nhu cầu mẫu (không phải hình minh họa), và cùng một bảng đó xuất hiện
ở Advisor, Customizer và trang cấu hình đã lưu.

Tham khảo đã xem trực tiếp: teenage.engineering/store (tấm nền sản phẩm xám phẳng không viền, tên và
giá là chữ thường bên dưới, bộ lọc là một hàng chữ), linear.app (chính sản phẩm làm hero, tiêu đề lớn,
gần như đơn sắc).

## 2. Nguyên tắc

1. **Dữ liệu là trang trí.** Màu chỉ xuất hiện khi mã hóa tỷ lệ tiền của một danh mục hoặc một trạng
   thái (ok/cảnh báo/xung đột).
2. **Một bảng cấu hình ở mọi nơi.** Danh mục, linh kiện, giá, tổng kẻ đậm.
3. **Màu mực nghĩa là "làm".** Một kiểu nút chính (viên thuốc đen trên nền sáng, trắng trên nền tối);
   mọi thứ khác là chữ, viền hoặc nút trong suốt.
4. **Không trang trí thừa.** Không nhãn viết hoa giãn chữ, không bước đánh số khi nội dung không phải
   trình tự, không bộ ba thẻ tính năng, không bóng đổ (trừ lớp phủ), gradient, lưới chấm hay đèn LED.
5. **Chuyển động chỉ trả lời thao tác** (mở, mở rộng, xác nhận). Khoảnh khắc dàn dựng duy nhất là các
   dòng của bảng mẫu lần lượt hiện khi đổi nhu cầu.

## 3. Tokens

Định nghĩa trong `apps/web/src/app/globals.css` (`@theme static`). Component chỉ dùng **token ngữ nghĩa**.

### 3.1 Màu ngữ nghĩa

| Token | Sáng | Tối | Dùng cho |
| --- | --- | --- | --- |
| `bg` | `#FFFFFF` | `#000000` | nền trang |
| `surface` | `#FFFFFF` | `#000000` | khối trên trang (tách bằng đường kẻ, không bóng) |
| `surface-2` | `#F1F2F3` | `#17181A` | tấm nền sản phẩm, nhóm dòng, ô nhập khi nghỉ |
| `surface-3` | `#E6E8EA` | `#232528` | hover / nhấn |
| `border` | `#E3E5E8` | `#2A2C2F` | đường kẻ mảnh |
| `border-strong` | `#8A9097` | `#6B7077` | viền ô nhập, gạch chân liên kết (≥ 3:1) |
| `fg` | `#000000` | `#FFFFFF` | chữ chính |
| `muted` | `#5F656C` | `#A2A7AD` | chữ phụ (≥ 4,5:1 trên `bg` và `surface-2`) |
| `accent` / `accent-fg` | `#000` / `#FFF` | `#FFF` / `#000` | nút chính, tab đang chọn, khung lựa chọn |
| `accent-ink` | `#000000` | `#FFFFFF` | liên kết (luôn gạch chân) |
| `ring` | `#000000` | `#FFFFFF` | viền focus 2 px, cách 2 px |
| `ok` / `ok-ink` | `#1F8A4C` / `#146C3A` | `#34C77B` / `#5AD893` | tương thích, còn hàng |
| `warn` / `warn-ink` | `#D97706` / `#9A4A07` | `#F59E0B` / `#FBBF24` | cảnh báo, sắp hết hàng |
| `danger` / `danger-ink` | `#DC2626` / `#B91C1C` | `#F04438` / `#F97066` | xung đột, lỗi, giá khuyến mãi |

### 3.2 Màu nhận diện danh mục

`--color-cat-{cpu,mainboard,ram,gpu,storage,psu,case,cooler}` (giữ nguyên từ bản đầu, đã kiểm trên cả
hai nền). **Chỉ làm dấu** (ô màu, vạch thanh phân bổ, chi tiết bản vẽ, logo), không dùng làm màu chữ.
Logo `LogoMark` là 8 dải màu có bề rộng theo một cấu hình chơi game 25 triệu thật (GPU rộng nhất).

### 3.3 Chữ

- **Archivo** biến thiên (`wght` 100–900, `wdth` 62–125, có bộ ký tự tiếng Việt) cho mọi chữ.
- Tiêu đề: `font-stretch-expanded` (125%), đậm 600–700, `tracking` âm, `line-height` ≥ 1,08 để dấu
  tiếng Việt chồng (ễ, ố) không chạm dòng trên. Trang chủ 64 px, h1 trang 32–48 px, admin 24 px.
- Thân chữ: độ rộng thường, 16/24, đậm 400/500.
- Số liệu (giá, số lượng, điểm, công suất): `tabular-nums` của Archivo. **Không dùng mono cho số
  liệu.** JetBrains Mono chỉ còn cho nội dung người dùng sao chép hoặc đọc như mã: nội dung chuyển
  khoản, tên tool và JSON trong nhật ký chat của admin, công thức trên trang trọng số.
- Thang cỡ: 12 · 14 · 16 · 20 · 24 · 32 · 48 · 64.

### 3.4 Hình khối, chiều sâu, chuyển động

- Nút: `rounded-full`. Ô nhập, tấm nền: `rounded-sm` (6 px). Khung chọn, thẻ: `rounded-md` (8 px).
  Khối lớn trên trang: không bo, tách bằng `border-border` và khoảng trắng.
- Bóng đổ: chỉ `shadow-overlay` cho dialog, drawer, popover. `shadow-raised` = none.
- Lựa chọn đang chọn: viền `fg` 1 px + vòng `0 0 0 1px fg` (`Card variant="selected"`).
- Chuyển động: `--ease-out` cho vào, `--ease-in` cho ra; khung giờ 140–300 ms. Tắt hết khi
  `prefers-reduced-motion`.

## 4. Cơ chế giao diện sáng / tối

- `<html data-theme="light|dark">`. Script inline trong `<head>` (`components/layout/theme-script.ts`) đọc `localStorage.theme`
  (`light` | `dark` | không có = theo hệ thống) và đặt `data-theme` trước lần vẽ đầu → không nhấp nháy, trang vẫn prerender tĩnh.
- `ThemeToggle` (`variant="icon"` cho header, `"segmented"` cho footer) ghi lựa chọn, nghe `prefers-color-scheme` khi ở chế độ hệ thống.
- Advisor và Customizer **theo chủ đề của trang** (bản đầu luôn tối). `WorkshopSurface` giữ lại làm vùng
  bọc để lớp phủ portal vào đúng chỗ, không còn đổi màu.
- **ThemeScope + portal:** `ThemeScope` cung cấp phần tử làm `container` cho Radix Portal. `Dialog`, `Drawer`, `Select`, `Tooltip`
  tự đọc qua `usePortalContainer()`; `ThemeScope theme="dark"` vẫn ghim được một vùng tối nếu cần.
- Biến thể `dark:` của Tailwind khớp `[data-theme=dark]` gần nhất nhưng **ưu tiên token** thay cho `dark:`.

## 5. Danh mục thành phần

Import từ `@/components/ui/*`, `@/components/domain/*`, `@/components/layout/*`. Helper: `cn()` (`@/lib/cn`), định dạng (`@/lib/format`:
`formatVnd`, `formatVndShort` re-export từ `@pc/shared`, thêm `formatPercent`, `formatCapacityGB`, `formatSpecValue`, `formatKeySpec`).

### 5.1 Primitive (`components/ui`)

| Thành phần | API chính | Trạng thái |
| --- | --- | --- |
| `Button` | `variant`: primary · secondary · outline · ghost · danger · workshop · link; `size`: sm 32 · md 40 · lg 48 · icon · icon-sm; `loading`; `asChild` | default, hover, focus-visible, disabled, loading (spinner + `aria-busy`); hình viên thuốc |
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
| `ThemeScope` | `theme` | — |

### 5.2 Nghiệp vụ (`components/domain`)

| Thành phần | Props (theo DTO `@pc/shared`) | Trạng thái / ghi chú |
| --- | --- | --- |
| `CompatibilityBadge` | `issues?: CompatibilityIssueDTO[]`, `status?`, `size`, `label?`, `tooltipOpen?`; helper `getCompatibilityStatus()` | ok "Tương thích" · warning "Cảnh báo" / "N cảnh báo" · error "Xung đột" / "N xung đột"; tooltip liệt kê mã luật C01–C15 + thông điệp, lỗi trước cảnh báo |
| `PriceTag` | `price`, `salePrice?`, `size` sm/md/lg, `layout` stacked/inline; helper `discountPercent()` | giá thường; khuyến mãi = giá mới + giá gốc gạch + badge `-N%` |
| `SpecTable` | `fields: SpecField[]`, `specs`, `highlight?: {key: 'warning'|'error'}`, `showEmpty`, `dense`, `caption` | dòng xung đột/cảnh báo tô nền + biểu tượng + chữ ẩn cho trình đọc màn hình |
| `AllocationBar` | `allocation` (0..1, `BuildDTO.allocation`), `amounts?`, `total?`, `legend` full/compact/none, `size`, `animate` | chạy trái→phải khi mount; đổi tỉ lệ thì vạch co giãn mượt (500 ms); hover vạch/chú thích làm mờ phần còn lại; `role="img"` + `aria-label` tóm tắt |
| `PerfMeter` | `score` 0–100, `label`, `caption`, `size` sm/md, `animate`; helper `perfTier()` | bậc: Cơ bản < 40 ≤ Phổ thông < 60 ≤ Khá < 75 ≤ Mạnh < 90 ≤ Rất mạnh; `role="meter"` |
| `ProductImage` | `src?`, `alt`, `category`, `sizes`, `priority` | tấm nền `surface-2` phẳng; có ảnh → `next/image`; không ảnh → bản vẽ kỹ thuật SVG theo danh mục, nét mực nhạt |
| `ProductCard` | `product: ProductSummaryDTO`, `href?` (mặc định `/p/{slug}`), `action?` (slot nút), `variant` grid/list, `maxSpecs` | `grid`: tấm nền + chữ, không khung; hãng, tên (gạch chân khi hover), một dòng thông số chính, giá; còn hàng / "Chỉ còn N" (≤ 5) / hết hàng; `list`: hàng có khung mảnh cho bộ chọn linh kiện |
| `CategoryIllustration` | `category` | dùng lẻ cho slot trống của Builder |
| `category.ts` | `CATEGORY_COLOR`; `CATEGORY_DESIGNATOR` còn trong mã nhưng không hiển thị nữa (thay bằng `CATEGORY_LABELS` + ô màu) | |

### 5.3 Bố cục (`components/layout`)

| Thành phần | Props | Ghi chú |
| --- | --- | --- |
| `SiteHeader` | `cartCount`, `categories?` (mặc định 8 danh mục → `/c/{key}`), `activeCategory?`, `accountSlot?`, `searchAction` (mặc định `/search`, tham số `q`), `searchDefaultValue` | Logo, ô tìm kiếm, nút **AI tư vấn cấu hình** (viên thuốc màu mực), đổi giao diện, giỏ hàng có số, tài khoản; hàng danh mục dạng chữ (đang xem = mực + gạch chân 2 px) cuộn ngang + "Tự build PC". Mobile: logo thu gọn, ô tìm kiếm xuống dòng. |
| `SiteFooter` | `categories?`, `note?` | 3 cột liên kết + ThemeToggle segmented |
| `AdminShell` | `title`, `actions`, `user`, `activeHref?`, `embedded?` | Sidebar nền trang, mục đang chọn tô `surface-2` (Tổng quan, Sản phẩm, Tồn kho, Benchmark, Trọng số thuật toán, Đơn hàng, Hội thoại AI) + topbar; mobile: menu mở drawer trái. `usePathname` nằm sau `Suspense` riêng vì route admin có tham số động. Danh sách mục nằm ở `admin-nav.ts` (`ADMIN_NAV`, module thường để server component import được). |
| `WorkshopSurface` | `mat` (tô `bg`) | Bọc khu Advisor/Builder để lớp phủ portal vào đúng vùng; theo chủ đề trang |
| `ThemeToggle` | `variant` icon/segmented | |
| `Logo`, `LogoMark`, `BRAND_NAME` | `href`, `compact` | Chữ "PC Builder" bản giãn + dấu 8 dải màu danh mục |

### 5.4 Thành phần nghiệp vụ của Advisor, Customizer, cửa hàng

- **BuildSheet** (`features/advisor/BuildSheet.tsx`, kèm `SheetTotal`, `CategoryLabel`): bảng cấu hình dùng
  chung. Trên cùng `AllocationBar legend="none"`; mỗi dòng = ô màu + tên danh mục | tên linh kiện (liên kết
  `/p/{slug}`) | giá `tabular-nums`, ngăn bằng đường kẻ mảnh; dòng tổng `border-t-2 border-fg` ghi "Tổng N linh
  kiện", ghi chú còn dư / vượt ngân sách và `Price`. Hẹp hơn 22rem thì tên linh kiện xuống dòng dưới. Trang chủ
  dùng bản riêng `SampleSheet` với cùng hình thức.
- **BuildCard / BuildCompare:** `Card` (đang chọn = `selected`, viền mực), tên cấu hình là nút bật chọn
  (`aria-pressed`), `CompatibilityBadge`, `PerfMeter size="sm"` (thanh liền mảnh), `BuildSheet`, hai nút "Mở
  trong Customizer" (nút chính) và "Thêm cả bộ vào giỏ". Ba cột trên máy tính, cuộn ngang có điểm dừng trên
  điện thoại.
- **ChatMessage / ChatPanel:** tin người dùng là bong bóng `surface-2` canh phải; trợ lý là chữ thường; trạng
  thái "Đang soạn câu trả lời…" bằng chữ (`role="status"`), con trỏ stream vạch 2 px. Tóm tắt cấu hình trong
  chat là các dòng: tên + điểm | dải phân bổ 8 màu thu nhỏ | giá.
- **ToolStatusChip:** chữ thường kèm `Spinner` khi đang chạy, dấu check `ok-ink` khi xong.
- **BuildSlot:** một dòng của bảng: ô màu + danh mục | linh kiện + dòng thông số | giá | "Đổi" và "×". Khe
  trống: nút chữ "＋ Chọn {danh mục}". Lỗi tương thích: dòng chữ `danger-ink`/`warn-ink` kèm mã luật bên dưới.
- **PartPicker:** `Drawer` + ô lọc + danh sách `ProductCard variant="list"`; bộ lọc đang bật dùng viền mực.
- **BuildSummaryBar:** khối "Tổng quan" bên phải (máy tính) / thanh dính đáy nền `bg` (điện thoại): tổng
  `Price size="xl"`, % ngân sách, công suất ước tính, `CompatibilityBadge`, một nút chính "Thêm vào giỏ".
- **VietQR / OrderTimeline:** ảnh QR trên tấm trắng cố định (kể cả giao diện tối) để app ngân hàng quét được,
  đếm ngược `tabular-nums text-2xl`; số tiền, nội dung chuyển khoản, số tài khoản là các dòng kẻ mảnh có nút
  "Sao chép" (nội dung và số tài khoản giữ mono vì người dùng gõ lại). Mốc thời gian: chấm 8 px, mốc hiện tại
  có vòng mực.
- **Admin:** `TableFrame` không khung (đường kẻ trên/dưới, dòng ngăn mảnh), `StatusText` (chữ màu trạng thái
  kèm biểu tượng, không nền), KPI là một hàng số liệu ngăn bằng đường kẻ.

## 6. Màn hình

Ảnh chụp thật ở `docs/design/screenshots/v2/` (1440 và 375 px, sáng và tối). Chú thích sơ đồ: `[ ]` nút,
`( )` ô nhập, `■■■■` thanh phân bổ 8 màu, `━━` dòng tổng kẻ đậm.

### `/` — Trang chủ (SSR, phần bảng mẫu stream sau)
```
PC Builder ▮▮▮▮   ( Tìm CPU, card… )          [AI tư vấn cấu hình]  ◐  🛒  Đăng nhập
CPU  Mainboard  RAM  Card đồ họa  Ổ cứng  Nguồn  Vỏ case  Tản nhiệt          Tự build PC
────────────────────────────────────────────────────────────────────────────────────
Cấu hình đúng            │ Chơi game 25tr | Đồ họa 40tr | Chạy AI 60tr | Văn phòng 12tr
nhu cầu, đúng            │ Tối ưu hiệu năng                     Ngân sách 25.000.000₫
ngân sách.  (giãn 125%)  │ ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
Kể bằng tiếng Việt…      │ ■ CPU        Intel Core i5-12400              3.190.000
( Chơi Valorant…  [Hỏi AI])│ ■ Card đồ họa Sapphire PULSE RX 7900 GRE   14.190.000
Thích tự chọn? Lắp từng… │ … 8 dòng
                         │ ━━ Tổng 8 linh kiện  còn dư 80.000₫      24.920.000₫
                         │ Engine xét 1.883 phương án trong 7 ms.  Hỏi tiếp về cấu hình này
────────────────────────────────────────────────────────────────────────────────────
Linh kiện:  [tấm] ×8 kèm tên        Mạnh nhất trong kho: lưới tấm nền + tên + giá
```

### `/advisor` — AI tư vấn (CSR, vừa khít khung nhìn)
```
AI tư vấn cấu hình                           Linh kiện và giá lấy từ kho; AI chỉ giải thích…
[Trò chuyện | Biểu mẫu]        │ So sánh cấu hình   Chơi game · ngân sách 25.000.000₫
Tóm tắt 3 cấu hình (dòng)      │ ┌Tối ưu hiệu năng┐ ┏Cân bằng━━━━━━┓ ┌Tiết kiệm─────┐
Trả lời của trợ lý…            │ │✓ Tương thích   │ ┃✓ Tương thích  ┃ │✓ Tương thích │
                               │ │76 ━━━━━━── Mạnh│ ┃71 ━━━━━─── Khá┃ │64 ━━━━──  Khá│
                               │ │BuildSheet      │ ┃BuildSheet     ┃ │BuildSheet    │
( Nhập nhu cầu và ngân sách… ↑)│ │[Mở trong Cust.]│ ┃[Mở trong…]    ┃ │[Mở trong…]   │
```
Điện thoại: hai tab "Tư vấn" / "Cấu hình N"; các cột cuộn ngang có điểm dừng.

### `/builder` — Tự build PC
```
Tự build PC (giãn)                         Mục đích sử dụng [Chơi game ▾]  Ngân sách (25.000.000 ₫)
Linh kiện 8/8                 Xóa cấu hình │ Tổng quan                 ✓ Tương thích
■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■ │ 21.850.000₫   Dùng 87% ngân sách
■ CPU   Intel Core i5-13400F    4.080.000 [Đổi] × │ Công suất ~385W / nguồn 650W ━━━━──
        LGA1700, 10 nhân, 16 luồng                │ [Thêm vào giỏ]  [Lưu & chia sẻ]
… 8 dòng                                          │ (Hỏi AI tối ưu)  Báo giá PDF
━━ Tổng 8/8 linh kiện  còn dư 3.150.000₫  21.850.000₫
```

### `/c/[category]` — Danh sách
Đường dẫn "Trang chủ / Card đồ họa", h1 giãn + số sản phẩm, "Sắp xếp" bên phải; cột lọc không khung (nhóm
ngăn bằng đường kẻ, số lượng `tabular-nums`); lưới 4 cột tấm nền + chữ, nút giỏ tròn nhỏ ở góc giá.

### `/p/[slug]` — Chi tiết sản phẩm
Tấm nền lớn trái; phải: hãng kèm ô màu danh mục, h1 giãn, mã SP, thông số nổi bật "AM4 / 6 nhân / 12 luồng",
giá, tình trạng, [− 1 +] [Thêm vào giỏ] (Thêm vào cấu hình), ba cam kết. Dưới: tab Thông số (bảng `plain`),
Hiệu năng, Mô tả.

### `/cart`, `/checkout`, `/orders/[code]/pay`
Giỏ: nhóm "Cấu hình …" có tiêu đề kẻ mực, các dòng kẻ mảnh, khối tóm tắt kết thúc bằng dòng tổng kẻ đậm và
một nút chính "Thanh toán". Checkout: các khối thông tin ngăn bằng đường kẻ, dòng tổng kẻ đậm, nút "Đặt hàng
và lấy mã QR". Thanh toán: QR trên tấm trắng, đếm ngược, ba dòng sao chép, trạng thái chờ tự cập nhật; bên
phải tóm tắt đơn và địa chỉ giao.

### `/admin` — Tổng quan
Sidebar chữ (mục đang chọn nền `surface-2`); hàng KPI 4 số liệu ngăn bằng đường kẻ; biểu đồ doanh thu với
nút Ngày/Tuần/Tháng; bảng đơn mới không khung; danh sách đơn theo trạng thái dùng `StatusText`.

## 7. Chất lượng

| Tiêu chí | Cách đáp ứng |
| --- | --- |
| Responsive 360 → 1440 | Kiểm `/design` ở 375 và 1440: không tràn ngang (`scrollWidth == clientWidth`); thành phần nhạy bề rộng dùng container query (`ProductCard list`, `AllocationBar`, `ProductImage`) |
| WCAG AA | `fg/bg` 21:1 (cả hai nền); `muted` 5,9:1 trên trắng, 5,3:1 trên `surface-2`; chữ `-ink` trên nền trạng thái nhạt ≥ 4,5:1; viền ô nhập `border-strong` 3,2:1; ring 2 px màu mực |
| Focus | `focus-ring` trên mọi phần tử tương tác; ô nhập đổi viền sang màu mực + vòng 1 px |
| Reduced motion | khối `@media (prefers-reduced-motion: reduce)` trong `globals.css` |
| Loading / empty / error | `Skeleton`, `Spinner`, `Button loading`, `EmptyState` (3 dạng) |
| Tiền tệ | luôn `formatVnd` / `Price` → `25.000.000₫`, Archivo `tabular-nums` |
| Màu không đứng một mình | trạng thái = biểu tượng + chữ; biểu đồ = chú thích + `aria-label` |

## 8. Ghi chú cho Frontend

- Bọc nội dung Advisor/Builder trong `<WorkshopSurface>` để lớp phủ portal đúng vùng; không tự đặt màu nền riêng.
- Không gọi API trong `components/layout/*`; truyền `cartCount`, `accountSlot`, `categories` từ page/layout của route group.
- `SiteHeader` gửi tìm kiếm tới `searchAction` (mặc định `/search?q=`); route này chưa có trong spec — hoặc dựng `/search`, hoặc truyền `searchAction`.
- `toast()` gọi được ở mọi client component; `<Toaster/>` đã có trong root layout.
- Muốn lớp phủ theo theme của một vùng riêng → bọc vùng đó bằng `ThemeScope`.
- Biểu đồ admin (recharts): dùng `var(--color-cat-*)` cho series theo danh mục, `var(--color-fg)` cho một series, chữ trục `var(--color-muted)`.
