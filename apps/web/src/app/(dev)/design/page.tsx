import { BUILD_LABEL_TEXT, CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import { Check, CloudOff, Download, Info, PackageOpen, Plus, SearchX, ShoppingCart } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { CompatibilityBadge } from '@/components/domain/CompatibilityBadge';
import { CATEGORY_COLOR } from '@/components/domain/category';
import { PerfMeter } from '@/components/domain/PerfMeter';
import { PriceTag } from '@/components/domain/PriceTag';
import { ProductCard } from '@/components/domain/ProductCard';
import { ProductImage } from '@/components/domain/ProductImage';
import { SpecTable } from '@/components/domain/SpecTable';
import { AdminShell } from '@/components/layout/AdminShell';
import { Logo } from '@/components/layout/Logo';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { WorkshopSurface } from '@/components/layout/WorkshopSurface';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Price } from '@/components/ui/Price';
import { Select } from '@/components/ui/Select';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatVnd } from '@/lib/format';
import { AllocationPlayground, OverlayDemo, ToastDemo } from './_demos';
import {
  BUILD_ALLOCATION,
  BUILD_TOTAL,
  CPU_FIELDS,
  CPU_SPECS,
  DEMO_BUILDS,
  ISSUES_ERROR,
  ISSUES_WARNING,
  PRODUCTS,
  TOKENS,
} from './_fixtures';
import { Section, Specimen, ThemePanes } from './_showcase';

export const metadata: Metadata = {
  title: 'Hệ thống thiết kế',
  robots: { index: false, follow: false },
};

const TOC = [
  { id: 'mau-sac', label: 'Màu sắc' },
  { id: 'chu', label: 'Chữ' },
  { id: 'hinh-khoi', label: 'Bo góc, bóng, khoảng cách' },
  { id: 'nut', label: 'Nút bấm' },
  { id: 'bieu-mau', label: 'Biểu mẫu' },
  { id: 'nhan', label: 'Nhãn, giá, tải' },
  { id: 'the', label: 'Thẻ, trạng thái trống' },
  { id: 'dieu-huong', label: 'Tabs, tooltip' },
  { id: 'lop-phu', label: 'Lớp phủ' },
  { id: 'nghiep-vu', label: 'Thành phần nghiệp vụ' },
  { id: 'workshop', label: 'Bề mặt Workshop' },
  { id: 'bo-cuc', label: 'Bố cục trang' },
];

const TYPE_SCALE = [
  { px: 48, cls: 'text-3xl font-extrabold', name: 'text-3xl', sample: 'Cấu hình chuẩn, đúng ngân sách' },
  { px: 32, cls: 'text-2xl font-bold', name: 'text-2xl', sample: 'Gợi ý 3 cấu hình cho 25 triệu' },
  { px: 24, cls: 'text-xl font-semibold', name: 'text-xl', sample: 'Card đồ họa' },
  { px: 20, cls: 'text-lg font-semibold', name: 'text-lg', sample: 'Thông số kỹ thuật' },
  {
    px: 16,
    cls: 'text-base',
    name: 'text-base',
    sample: 'Ryzen 5 7600X đi cùng RTX 5060 Ti cho khoảng 100 FPS ở 2K, còn dư tiền nâng cấp ổ cứng.',
  },
  { px: 14, cls: 'text-sm', name: 'text-sm', sample: 'Giá đã gồm VAT. Lắp ráp miễn phí khi mua cả bộ.' },
  { px: 12, cls: 'text-xs', name: 'text-xs', sample: 'Cập nhật tồn kho 5 phút trước' },
];

const RADII = [
  { cls: 'rounded-xs', px: 4, use: 'Nhãn, checkbox' },
  { cls: 'rounded-sm', px: 8, use: 'Nút, ô nhập' },
  { cls: 'rounded-md', px: 12, use: 'Thẻ' },
  { cls: 'rounded-lg', px: 16, use: 'Hộp thoại, panel' },
];

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16];

export default function DesignSystemPage() {
  return (
    <div className="min-h-dvh">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-6">
          <Logo />
          <Badge tone="outline" className="max-sm:hidden">
            Hệ thống thiết kế
          </Badge>
          <ThemeToggle variant="segmented" className="ms-auto" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:grid lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-12 lg:px-6">
        <nav aria-label="Mục lục" className="hidden lg:block">
          <ul className="sticky top-6 flex flex-col gap-0.5">
            {TOC.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="focus-ring block rounded-xs px-2 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  {t.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-col gap-16">
          <header className="flex max-w-3xl flex-col gap-4">
            <h1 className="text-2xl font-extrabold text-fg sm:text-3xl">Tech Workshop</h1>
            <p className="text-base text-muted">
              Cửa hàng dùng nền nhôm sáng để đọc thông số cho dễ. Khu AI tư vấn và Tự build PC đặt trên tấm
              thảm than chì của bàn lắp ráp, kể cả khi trang đang ở giao diện sáng. Cyan dành cho hành động,
              lime chỉ dùng cho “tương thích”, amber cho cảnh báo, đỏ cho xung đột.
            </p>
            <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
              {TOC.map((t) => (
                <li key={t.id} className="shrink-0">
                  <a
                    href={`#${t.id}`}
                    className="focus-ring inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-sm text-muted"
                  >
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </header>

          <Section
            id="mau-sac"
            title="Màu sắc"
            description="Thành phần chỉ dùng token ngữ nghĩa (bg-surface, text-muted…), không dùng mã màu trực tiếp, nên tự đổi theo vùng sáng, tối hoặc Workshop."
          >
            <ThemePanes>
              {(t) => (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {TOKENS.map((tok) => (
                    <li key={tok.token} className="flex min-w-0 flex-col gap-1.5">
                      <span
                        className="h-11 rounded-sm border border-border"
                        style={{ backgroundColor: `var(--color-${tok.token})` }}
                      />
                      <span className="truncate font-mono text-xs font-semibold text-fg">{tok.token}</span>
                      <span className="truncate font-mono text-xs text-muted">{tok[t]}</span>
                      <span className="text-xs text-muted">{tok.use}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ThemePanes>
            <Card className="p-5">
              <Specimen label="Màu nhận diện danh mục: chỉ tô cho vạch, ô màu, chi tiết minh họa; không dùng cho chữ">
                <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  {CATEGORY_KEYS.map((k) => (
                    <li key={k} className="flex flex-col gap-1.5">
                      <span className="h-8 rounded-xs" style={{ backgroundColor: CATEGORY_COLOR[k] }} />
                      <span className="text-xs text-fg">{CATEGORY_LABELS[k]}</span>
                      <span className="font-mono text-xs text-muted">cat-{k}</span>
                    </li>
                  ))}
                </ul>
              </Specimen>
            </Card>
          </Section>

          <Section
            id="chu"
            title="Chữ"
            description="Be Vietnam Pro cho giao diện (dấu tiếng Việt chồng tầng vẫn thoáng), JetBrains Mono cho giá và thông số. Thang 12/14/16/20/24/32/48."
          >
            <Card className="divide-y divide-border">
              {TYPE_SCALE.map((s) => (
                <div
                  key={s.px}
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-baseline"
                >
                  <span className="font-mono text-xs text-muted">
                    {s.px}px <span className="ms-1 text-fg">{s.name}</span>
                  </span>
                  <span className={`${s.cls} min-w-0 text-fg`}>{s.sample}</span>
                </div>
              ))}
              <div className="grid gap-2 px-5 py-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-baseline">
                <span className="font-mono text-xs text-muted">
                  mono <span className="ms-1 text-fg">font-mono</span>
                </span>
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-base text-fg tabular-nums">
                  <Price amount={BUILD_TOTAL} size="lg" />
                  <span>AM5</span>
                  <span>DDR5-6000 CL30</span>
                  <span>850W 80+ Gold</span>
                </span>
              </div>
            </Card>
          </Section>

          <Section
            id="hinh-khoi"
            title="Bo góc, bóng, khoảng cách"
            description="Bo góc theo cấp bậc: phần tử nhỏ bo ít, khối chứa bo nhiều. Chỉ hai mức bóng; thẻ thường dựa vào viền thay vì bóng. Khoảng cách theo lưới 4 px."
          >
            <ThemePanes>
              {() => (
                <>
                  <Specimen label="Bo góc">
                    {RADII.map((r) => (
                      <div key={r.px} className="flex flex-col items-start gap-1.5">
                        <div className={`${r.cls} size-16 border border-border-strong bg-surface-2`} />
                        <span className="font-mono text-xs text-fg">{r.px}px</span>
                        <span className="text-xs text-muted">{r.use}</span>
                      </div>
                    ))}
                  </Specimen>
                  <Specimen label="Bóng">
                    <div className="flex h-20 w-40 items-center justify-center rounded-md border border-border bg-surface text-xs text-muted shadow-raised">
                      shadow-raised
                    </div>
                    <div className="flex h-20 w-40 items-center justify-center rounded-md border border-border bg-surface text-xs text-muted shadow-overlay">
                      shadow-overlay
                    </div>
                  </Specimen>
                  <Specimen label="Khoảng cách (bội số 4 px)" className="flex-col items-start gap-1.5">
                    {SPACING.map((s) => (
                      <div key={s} className="flex items-center gap-3">
                        <span className="w-12 font-mono text-xs text-muted">{s * 4}px</span>
                        <span className="h-2.5 rounded-[2px] bg-accent" style={{ width: s * 4 }} />
                      </div>
                    ))}
                  </Specimen>
                </>
              )}
            </ThemePanes>
          </Section>

          <Section
            id="nut"
            title="Nút bấm"
            description="Nút chính màu cyan với chữ than chì và gờ phím phía dưới. Nút Workshop luôn màu than chì để dẫn vào khu AI. Mọi nút có vòng focus 2 px."
          >
            <ThemePanes>
              {() => (
                <>
                  <Specimen label="Biến thể">
                    <Button>
                      <ShoppingCart aria-hidden />
                      Thêm vào giỏ
                    </Button>
                    <Button variant="secondary">Lưu cấu hình</Button>
                    <Button variant="outline">So sánh</Button>
                    <Button variant="ghost">Để sau</Button>
                    <Button variant="danger">Xóa sản phẩm</Button>
                    <Button variant="workshop">
                      <span aria-hidden className="size-1.5 rounded-full bg-cyan" />
                      AI tư vấn cấu hình
                    </Button>
                    <Button variant="link">Xem chi tiết</Button>
                  </Specimen>
                  <Specimen label="Kích thước">
                    <Button size="sm">Nhỏ 32</Button>
                    <Button size="md">Vừa 40</Button>
                    <Button size="lg">Lớn 48</Button>
                    <Button size="icon" variant="secondary" aria-label="Xuất báo giá PDF">
                      <Download aria-hidden />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Thêm">
                      <Plus aria-hidden />
                    </Button>
                  </Specimen>
                  <Specimen label="Trạng thái">
                    <Button loading>Đang thêm…</Button>
                    <Button disabled>Hết hàng</Button>
                    <Button variant="secondary" disabled>
                      Không khả dụng
                    </Button>
                    <Button variant="secondary" asChild>
                      <Link href="#nut">Liên kết dạng nút</Link>
                    </Button>
                  </Specimen>
                </>
              )}
            </ThemePanes>
          </Section>

          <Section
            id="bieu-mau"
            title="Biểu mẫu"
            description="Viền ô nhập đạt 3:1 để nhìn ra ô. Lỗi nói rõ sai gì và sửa thế nào. Field tự nối nhãn, gợi ý và lỗi với ô nhập."
          >
            <ThemePanes>
              {() => (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Họ và tên người nhận" required>
                    <Input placeholder="Nguyễn Văn An" autoComplete="name" />
                  </Field>
                  <Field label="Số điện thoại" required error="Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.">
                    <Input defaultValue="09123" inputMode="tel" />
                  </Field>
                  <Field label="Ngân sách" hint="Từ 5 đến 200 triệu">
                    <Input mono defaultValue="25.000.000" trailing="₫" inputMode="numeric" />
                  </Field>
                  <Field label="Mã giảm giá">
                    <Input placeholder="Chưa áp dụng" disabled />
                  </Field>
                  <Field label="Sắp xếp">
                    <Select
                      defaultValue="performance"
                      options={[
                        { value: 'performance', label: 'Hiệu năng cao nhất' },
                        { value: 'price_asc', label: 'Giá tăng dần' },
                        { value: 'price_desc', label: 'Giá giảm dần' },
                        { value: 'newest', label: 'Mới nhất' },
                      ]}
                    />
                  </Field>
                  <Field label="Mục đích sử dụng" error="Chọn một mục đích để AI gợi ý đúng hơn.">
                    <Select
                      placeholder="Chọn mục đích"
                      options={[
                        { value: 'gaming', label: 'Chơi game' },
                        { value: 'graphics', label: 'Đồ họa / Dựng phim' },
                        { value: 'ai', label: 'Lập trình / AI' },
                        { value: 'office', label: 'Văn phòng / Học tập' },
                      ]}
                    />
                  </Field>
                  <Field label="Ghi chú giao hàng" className="sm:col-span-2">
                    <Textarea placeholder="Ví dụ: giao giờ hành chính, gọi trước 15 phút" />
                  </Field>
                  <fieldset className="flex flex-col gap-3 sm:col-span-2">
                    <legend className="mb-3 text-sm font-medium text-fg">Socket (bộ lọc)</legend>
                    <Checkbox label="Tất cả socket AMD" defaultChecked="indeterminate" />
                    <Checkbox label="AM5" meta={12} defaultChecked />
                    <Checkbox label="AM4" meta={7} />
                    <Checkbox label="LGA1851" meta={0} description="Tạm hết hàng" disabled />
                  </fieldset>
                </div>
              )}
            </ThemePanes>
          </Section>

          <Section id="nhan" title="Nhãn, giá, trạng thái tải">
            <ThemePanes>
              {() => (
                <>
                  <Specimen label="Badge">
                    <Badge>Mặc định</Badge>
                    <Badge tone="accent">Mới về</Badge>
                    <Badge tone="ok">Còn hàng</Badge>
                    <Badge tone="warn">Sắp hết</Badge>
                    <Badge tone="danger">Ngừng kinh doanh</Badge>
                    <Badge tone="solid">Cân bằng</Badge>
                    <Badge tone="outline">Giá tham khảo</Badge>
                  </Specimen>
                  <Specimen label="Badge mono cho mã và số">
                    <Badge mono>AM5</Badge>
                    <Badge mono>DDR5</Badge>
                    <Badge mono tone="danger">
                      C01
                    </Badge>
                    <Badge mono tone="accent" size="sm">
                      -12%
                    </Badge>
                  </Specimen>
                  <Specimen label="Price">
                    <Price amount={590_000} size="sm" />
                    <Price amount={4_990_000} />
                    <Price amount={12_290_000} size="lg" />
                    <Price amount={BUILD_TOTAL} size="2xl" />
                    <Price amount={13_490_000} tone="strike" size="sm" />
                  </Specimen>
                  <Specimen label="Spinner">
                    <Spinner size="sm" />
                    <Spinner />
                    <Spinner size="lg" className="text-accent-ink" />
                  </Specimen>
                  <Specimen label="Skeleton (thẻ sản phẩm đang tải)">
                    <div className="flex w-56 flex-col gap-3 rounded-md border border-border bg-surface p-3">
                      <Skeleton className="aspect-[4/3] w-full" />
                      <Skeleton className="h-3 w-16" />
                      <SkeletonText lines={2} />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  </Specimen>
                </>
              )}
            </ThemePanes>
          </Section>

          <Section id="the" title="Thẻ và trạng thái trống">
            <ThemePanes>
              {() => (
                <>
                  <div className="grid items-start gap-4 sm:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Cấu hình đã lưu</CardTitle>
                        <CardDescription>Gaming 2K tầm 25 triệu</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Price amount={BUILD_TOTAL} size="lg" />
                      </CardContent>
                      <CardFooter>
                        <Button size="sm">Mua cả bộ</Button>
                        <Button size="sm" variant="ghost">
                          Chia sẻ
                        </Button>
                      </CardFooter>
                    </Card>
                    <div className="flex flex-col gap-4">
                      <Card variant="inset" className="p-4 text-sm text-muted">
                        Thẻ inset: nằm trong một bề mặt khác.
                      </Card>
                      <Card variant="selected" className="p-4 text-sm">
                        Thẻ đang chọn: cấu hình “Cân bằng”.
                      </Card>
                      <Card variant="interactive" className="relative p-4 text-sm">
                        <Link href="#the" className="outline-none after:absolute after:inset-0">
                          Thẻ bấm được (hover, focus)
                        </Link>
                      </Card>
                    </div>
                  </div>
                  <Card>
                    <EmptyState
                      icon={<PackageOpen />}
                      title="Giỏ hàng đang trống"
                      description="Thêm linh kiện từ danh mục, hoặc để AI tư vấn một cấu hình trọn bộ theo ngân sách của bạn."
                      actions={
                        <>
                          <Button variant="workshop">AI tư vấn cấu hình</Button>
                          <Button variant="secondary">Xem linh kiện</Button>
                        </>
                      }
                    />
                  </Card>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                      <EmptyState
                        compact
                        icon={<SearchX />}
                        title="Không có sản phẩm phù hợp"
                        description="Bỏ bớt bộ lọc socket hoặc nới khoảng giá."
                        actions={
                          <Button size="sm" variant="secondary">
                            Xóa bộ lọc
                          </Button>
                        }
                      />
                    </Card>
                    <Card>
                      <EmptyState
                        compact
                        tone="error"
                        icon={<CloudOff />}
                        title="Không tải được sản phẩm"
                        description="Máy chủ không phản hồi. Kiểm tra kết nối rồi thử lại."
                        actions={<Button size="sm">Thử lại</Button>}
                      />
                    </Card>
                  </div>
                </>
              )}
            </ThemePanes>
          </Section>

          <Section id="dieu-huong" title="Tabs và tooltip">
            <ThemePanes>
              {() => (
                <>
                  <Specimen label="Tabs segmented: đổi chế độ xem tại chỗ">
                    <Tabs defaultValue="balanced" className="w-full">
                      <TabsList aria-label="Cấu hình gợi ý">
                        <TabsTrigger value="performance">{BUILD_LABEL_TEXT.performance}</TabsTrigger>
                        <TabsTrigger value="balanced">{BUILD_LABEL_TEXT.balanced}</TabsTrigger>
                        <TabsTrigger value="budget">{BUILD_LABEL_TEXT.budget}</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </Specimen>
                  <Specimen label="Tabs line: các phần của trang">
                    <Tabs variant="line" defaultValue="specs" className="w-full">
                      <TabsList aria-label="Chi tiết sản phẩm">
                        <TabsTrigger value="specs">Thông số</TabsTrigger>
                        <TabsTrigger value="bench">Benchmark</TabsTrigger>
                        <TabsTrigger value="desc">Mô tả</TabsTrigger>
                      </TabsList>
                      <TabsContent value="specs" className="text-sm text-muted">
                        Bảng thông số hiển thị ở đây.
                      </TabsContent>
                      <TabsContent value="bench" className="text-sm text-muted">
                        Điểm benchmark hiển thị ở đây.
                      </TabsContent>
                      <TabsContent value="desc" className="text-sm text-muted">
                        Mô tả sản phẩm hiển thị ở đây.
                      </TabsContent>
                    </Tabs>
                  </Specimen>
                  <Specimen label="Tooltip (rê chuột hoặc focus)">
                    <Tooltip content="Công suất nguồn khuyến nghị = (TDP CPU + TGP GPU + 75 W) × 1,3">
                      <Button variant="outline" size="sm">
                        <Info aria-hidden />
                        Cách tính công suất
                      </Button>
                    </Tooltip>
                  </Specimen>
                </>
              )}
            </ThemePanes>
          </Section>

          <Section
            id="lop-phu"
            title="Lớp phủ"
            description="Hộp thoại, ngăn kéo (bottom sheet trên điện thoại, panel bên phải từ 640 px) và thông báo. Lớp phủ mở từ vùng nào thì mang giao diện của vùng đó."
          >
            <ThemePanes>
              {() => (
                <>
                  <Specimen label="Dialog và Drawer">
                    <OverlayDemo />
                  </Specimen>
                  <Specimen label="Toast (góc trên)">
                    <ToastDemo />
                  </Specimen>
                </>
              )}
            </ThemePanes>
          </Section>

          <Section
            id="nghiep-vu"
            title="Thành phần nghiệp vụ"
            description="Dùng chung cho cửa hàng, AI tư vấn, Tự build PC và trang quản trị. Props khớp DTO trong @pc/shared."
          >
            <ThemePanes>
              {() => (
                <>
                  <Specimen
                    label="CompatibilityBadge: tương thích, cảnh báo, xung đột (tooltip ghi mã luật)"
                    className="pb-2"
                  >
                    <CompatibilityBadge status="ok" />
                    <CompatibilityBadge issues={ISSUES_WARNING} />
                    <CompatibilityBadge issues={ISSUES_ERROR} />
                    <CompatibilityBadge issues={ISSUES_WARNING} size="sm" />
                  </Specimen>
                  <div className="flex min-h-36 items-end justify-center">
                    <CompatibilityBadge issues={ISSUES_ERROR} tooltipOpen />
                  </div>
                  <Specimen label="PriceTag">
                    <PriceTag price={4_990_000} />
                    <PriceTag price={13_490_000} salePrice={12_290_000} />
                    <PriceTag price={2_890_000} salePrice={2_590_000} size="sm" layout="inline" />
                    <PriceTag price={13_490_000} salePrice={12_290_000} size="lg" />
                  </Specimen>
                  <Specimen label="SpecTable: dòng gây xung đột được đánh dấu" className="block">
                    <SpecTable
                      caption="Intel Core i5-14600K"
                      fields={CPU_FIELDS}
                      specs={CPU_SPECS}
                      highlight={{ socket: 'error', tdpW: 'warning' }}
                    />
                  </Specimen>
                  <Specimen label="AllocationBar: phân bổ ngân sách theo danh mục" className="block">
                    <AllocationPlayground />
                  </Specimen>
                  <Specimen label="AllocationBar gọn" className="block">
                    <AllocationBar allocation={BUILD_ALLOCATION} legend="compact" size="sm" animate={false} />
                  </Specimen>
                  <Specimen
                    label="PerfMeter"
                    className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"
                  >
                    <PerfMeter score={86} label="Hiệu năng chơi game" caption="Khoảng 140 FPS ở 2K" />
                    <PerfMeter score={58} label="Dựng phim, render" caption="Xuất video 4K khoảng 12 phút" />
                    <div className="flex flex-col gap-2.5 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                      <PerfMeter size="sm" score={94} label="Cấu hình hiệu năng" />
                      <PerfMeter size="sm" score={71} label="Cấu hình cân bằng" />
                      <PerfMeter size="sm" score={34} label="Cấu hình văn phòng" />
                    </div>
                  </Specimen>
                  <Specimen
                    label="ProductImage khi chưa có ảnh: bản vẽ kỹ thuật theo danh mục"
                    className="block"
                  >
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                      {CATEGORY_KEYS.map((k) => (
                        <li key={k} className="flex flex-col gap-1.5">
                          <ProductImage category={k} alt={CATEGORY_LABELS[k]} />
                          <span className="text-xs text-muted">{CATEGORY_LABELS[k]}</span>
                        </li>
                      ))}
                    </ul>
                  </Specimen>
                  <Specimen label="ProductCard: giảm giá, sắp hết, hết hàng" className="block">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                      {PRODUCTS.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          action={
                            <Button
                              size="icon-sm"
                              variant={p.stock > 0 ? 'primary' : 'secondary'}
                              disabled={p.stock <= 0}
                              aria-label={`Thêm ${p.name} vào giỏ`}
                            >
                              <Plus aria-hidden />
                            </Button>
                          }
                        />
                      ))}
                    </div>
                  </Specimen>
                  <Specimen
                    label="ProductCard dạng danh sách (ngăn chọn linh kiện)"
                    className="grid items-start"
                  >
                    {PRODUCTS.slice(0, 2).map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        variant="list"
                        action={
                          <Button size="sm" variant="secondary">
                            Chọn
                          </Button>
                        }
                      />
                    ))}
                  </Specimen>
                </>
              )}
            </ThemePanes>
          </Section>

          <Section
            id="workshop"
            title="Bề mặt Workshop"
            description="WorkshopSurface giữ màu than chì cho AI tư vấn và Tự build PC ngay cả trên trang sáng. Bản dựng dưới đây là tham chiếu cho khoảnh khắc demo: chip trạng thái công cụ, 3 cấu hình trượt vào, thanh phân bổ chạy, lời giải thích stream."
          >
            <WorkshopSurface className="flex flex-col gap-5 rounded-lg border border-border p-4 sm:p-6">
              <div className="ms-auto max-w-md rounded-md rounded-ee-xs bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg">
                Chơi game 2K, tầm 25 triệu, thích case trắng
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs text-muted">
                  <Check className="size-3.5 text-ok-ink" aria-hidden />
                  Đã hiểu nhu cầu: chơi game, 2K, 25 triệu
                </span>
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 text-xs text-accent-ink">
                  <Spinner size="sm" label={null} />
                  Đang chọn linh kiện trong kho…
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {DEMO_BUILDS.map((b, i) => (
                  <Card
                    key={b.label}
                    variant={b.label === 'balanced' ? 'selected' : 'default'}
                    className="flex animate-card-in flex-col gap-4 p-5"
                    style={{ animationDelay: `${i * 110}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={b.label === 'balanced' ? 'accent' : 'neutral'}>
                        {BUILD_LABEL_TEXT[b.label]}
                      </Badge>
                      <CompatibilityBadge size="sm" issues={b.warnings} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <Price amount={b.total} size="xl" />
                      <span className="text-xs text-muted">Còn dư {formatVnd(25_000_000 - b.total)}</span>
                    </div>
                    <PerfMeter
                      size="sm"
                      score={b.score}
                      label={`Điểm hiệu năng ${BUILD_LABEL_TEXT[b.label]}`}
                    />
                    <AllocationBar allocation={b.allocation} size="sm" legend="compact" />
                    <ul className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
                      {b.parts.map((p) => (
                        <li key={p.category} className="flex items-baseline justify-between gap-3">
                          <span className="text-muted">{CATEGORY_LABELS[p.category]}</span>
                          <span className="truncate text-end font-medium text-fg">{p.name}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex gap-2">
                      <Button size="sm" className="flex-1">
                        Mở trong Customizer
                      </Button>
                      <Button size="icon-sm" variant="secondary" aria-label="Thêm cả bộ vào giỏ">
                        <ShoppingCart aria-hidden />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              <p className="max-w-3xl text-sm text-fg">
                Cấu hình Cân bằng dồn 40% ngân sách cho card đồ họa vì chơi game ở 2K phụ thuộc GPU nhiều
                nhất, CPU 6 nhân vẫn đủ để không nghẽn
                <span
                  aria-hidden
                  className="ms-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-caret bg-accent"
                />
              </p>
            </WorkshopSurface>
          </Section>

          <Section
            id="bo-cuc"
            title="Bố cục trang"
            description="Header, footer và khung quản trị chỉ nhận dữ liệu qua props (số lượng giỏ, người dùng, danh mục); không tự gọi API."
          >
            <h3 className="text-sm font-semibold text-fg">SiteHeader</h3>
            <ThemePanes stack flush>
              {() => <SiteHeader cartCount={3} activeCategory="gpu" className="static" />}
            </ThemePanes>
            <h3 className="text-sm font-semibold text-fg">SiteFooter</h3>
            <ThemePanes stack flush>
              {() => <SiteFooter />}
            </ThemePanes>
            <h3 className="text-sm font-semibold text-fg">AdminShell</h3>
            <ThemePanes stack flush>
              {() => (
                <div className="h-[520px] overflow-hidden border-t border-border">
                  <AdminShell
                    embedded
                    activeHref="/admin/orders"
                    title="Đơn hàng"
                    actions={<Button size="sm">Xuất báo cáo</Button>}
                    user={
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-fg">Trần Minh</span>
                        <span className="text-xs text-muted">Quản trị viên</span>
                      </div>
                    }
                  >
                    <div className="grid gap-4 sm:grid-cols-3">
                      {[
                        { label: 'Doanh thu hôm nay', value: formatVnd(48_630_000) },
                        { label: 'Đơn chờ thanh toán', value: '7' },
                        { label: 'Hội thoại AI hôm nay', value: '132' },
                      ].map((s) => (
                        <Card key={s.label} className="flex flex-col gap-1 p-4">
                          <span className="text-sm text-muted">{s.label}</span>
                          <span className="font-mono text-xl font-semibold text-fg tabular-nums">
                            {s.value}
                          </span>
                        </Card>
                      ))}
                    </div>
                    <Card className="mt-4">
                      <EmptyState
                        compact
                        icon={<PackageOpen />}
                        title="Chưa có đơn hàng mới"
                        description="Đơn mới sẽ hiện ở đây ngay khi khách thanh toán xong."
                      />
                    </Card>
                  </AdminShell>
                </div>
              )}
            </ThemePanes>
          </Section>
        </main>
      </div>
    </div>
  );
}
