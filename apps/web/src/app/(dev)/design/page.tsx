import { BUILD_LABEL_TEXT, CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import { CloudOff, Download, Info, PackageOpen, Plus, SearchX, ShoppingCart } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
  ISSUES_ERROR,
  ISSUES_WARNING,
  PRODUCTS,
} from './_fixtures';
import { Section, Specimen, ThemePanes } from './_showcase';

export const metadata: Metadata = {
  title: 'Hệ thống thiết kế',
  robots: { index: false, follow: false },
};

const TOC = [
  { id: 'mau-sac', label: 'Màu sắc' },
  { id: 'chu', label: 'Chữ' },
  { id: 'hinh-khoi', label: 'Bo góc, lớp phủ, khoảng cách' },
  { id: 'nut', label: 'Nút bấm' },
  { id: 'bieu-mau', label: 'Biểu mẫu' },
  { id: 'nhan', label: 'Nhãn, giá, tải' },
  { id: 'the', label: 'Thẻ, trạng thái trống' },
  { id: 'dieu-huong', label: 'Tabs, tooltip' },
  { id: 'lop-phu', label: 'Lớp phủ' },
  { id: 'nghiep-vu', label: 'Thành phần nghiệp vụ' },
  { id: 'bo-cuc', label: 'Bố cục trang' },
];

/** Bench tokens, mirrored from globals.css (light / dark). */
const TOKENS: { token: string; light: string; dark: string; use: string }[] = [
  { token: 'bg', light: '#ffffff', dark: '#000000', use: 'Nền trang' },
  { token: 'surface', light: '#ffffff', dark: '#000000', use: 'Panel trên trang, tách bằng đường kẻ' },
  { token: 'surface-2', light: '#f1f2f3', dark: '#17181a', use: 'Tấm sản phẩm, dòng nhóm, ô nhập khi nghỉ' },
  { token: 'surface-3', light: '#e6e8ea', dark: '#232528', use: 'Hover, nhấn' },
  { token: 'border', light: '#e3e5e8', dark: '#2a2c2f', use: 'Đường kẻ mảnh' },
  { token: 'border-strong', light: '#8a9097', dark: '#6b7077', use: 'Viền ô nhập, đường chia cần 3:1' },
  { token: 'fg', light: '#000000', dark: '#ffffff', use: 'Mực: chữ chính' },
  { token: 'muted', light: '#5f656c', dark: '#a2a7ad', use: 'Chữ phụ (≥ 4.5:1)' },
  {
    token: 'accent',
    light: '#000000',
    dark: '#ffffff',
    use: 'Màu hành động duy nhất: nút đen, tab đang chọn',
  },
  { token: 'accent-fg', light: '#ffffff', dark: '#000000', use: 'Chữ trên nền accent' },
  { token: 'ok', light: '#1f8a4c', dark: '#34c77b', use: 'Dấu trạng thái tốt; chữ dùng ok-ink' },
  { token: 'warn', light: '#d97706', dark: '#f59e0b', use: 'Dấu cảnh báo; chữ dùng warn-ink' },
  { token: 'danger', light: '#dc2626', dark: '#f04438', use: 'Dấu xung đột, lỗi; chữ dùng danger-ink' },
  { token: 'ring', light: '#000000', dark: '#ffffff', use: 'Vòng focus' },
];

const TYPE_SCALE = [
  {
    px: 48,
    cls: 'text-3xl font-bold font-stretch-expanded tracking-[-0.03em]',
    name: 'text-3xl',
    sample: 'Cấu hình đúng nhu cầu, đúng ngân sách.',
  },
  {
    px: 32,
    cls: 'text-2xl font-semibold font-stretch-expanded tracking-[-0.03em]',
    name: 'text-2xl',
    sample: 'Giỏ hàng',
  },
  {
    px: 24,
    cls: 'text-xl font-semibold font-stretch-expanded tracking-[-0.02em]',
    name: 'text-xl',
    sample: 'Tổng quan (tiêu đề trang quản trị)',
  },
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
  { cls: 'rounded-xs', label: '3px', use: 'Checkbox, vạch phân bổ' },
  { cls: 'rounded-sm', label: '6px', use: 'Ô nhập, tấm sản phẩm' },
  { cls: 'rounded-md', label: '8px', use: 'Thẻ khi cần khung' },
  { cls: 'rounded-lg', label: '12px', use: 'Hộp thoại' },
  { cls: 'rounded-full', label: 'pill', use: 'Mọi nút hành động' },
];

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16];

/** Dev-only showcase; a production build serves it only when NEXT_PUBLIC_SHOW_DESIGN=1 (e.g. for a design review). */
function isDesignPageEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_SHOW_DESIGN === '1';
}

export default function DesignSystemPage() {
  if (!isDesignPageEnabled()) notFound();
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
            <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
              Bench
            </h1>
            <p className="text-base text-muted">
              Bàn làm việc sáng dưới đèn: nền trắng và xám lạnh, mực đen, đường kẻ mảnh, số liệu xếp cột thẳng
              hàng. Màu duy nhất đến từ dữ liệu: tám màu danh mục cho biết ngân sách chia cho CPU, card đồ
              họa, RAM… Đen nghĩa là “làm đi”: một kiểu nút chính, còn lại là chữ, viền hoặc nút trong suốt.
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
            description="Thành phần chỉ dùng token ngữ nghĩa (bg-surface, text-muted…), không dùng mã màu trực tiếp, nên tự đổi theo vùng sáng hoặc tối. Trạng thái nói bằng màu mực (ok-ink, warn-ink, danger-ink), không bằng khung màu."
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
            description="Archivo (biến thiên độ đậm và độ rộng) cho mọi chữ. Tiêu đề trang dùng bản rộng 125%, chữ thường giữ độ rộng chuẩn. Số liệu dùng tabular-nums; JetBrains Mono chỉ cho thứ người dùng sao chép như nội dung chuyển khoản. Thang 12/14/16/20/24/32/48."
          >
            <Card className="divide-y divide-border">
              {TYPE_SCALE.map((s) => (
                <div
                  key={s.px}
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-baseline"
                >
                  <span className="text-xs text-muted tabular-nums">
                    {s.px}px <span className="ms-1 text-fg">{s.name}</span>
                  </span>
                  <span className={`${s.cls} min-w-0 text-fg`}>{s.sample}</span>
                </div>
              ))}
              <div className="grid gap-2 px-5 py-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-baseline">
                <span className="text-xs text-muted">
                  số <span className="ms-1 text-fg">tabular-nums</span>
                </span>
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1 text-base text-fg tabular-nums">
                  <Price amount={BUILD_TOTAL} size="lg" />
                  <span>AM5</span>
                  <span>DDR5-6000 CL30</span>
                  <span>850W 80+ Gold</span>
                </span>
              </div>
              <div className="grid gap-2 px-5 py-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-baseline">
                <span className="text-xs text-muted">
                  mã <span className="ms-1 text-fg">font-mono</span>
                </span>
                <span className="min-w-0 font-mono text-base font-semibold text-fg">PCB20261108A7K2</span>
              </div>
            </Card>
          </Section>

          <Section
            id="hinh-khoi"
            title="Bo góc, lớp phủ, khoảng cách"
            description="Nút hành động là viên thuốc; ô nhập và tấm sản phẩm bo 6 px; panel không bo, tách nhau bằng đường kẻ và khoảng trống. Không có bóng, trừ lớp phủ (hộp thoại, ngăn kéo, popover). Khoảng cách theo lưới 4 px."
          >
            <ThemePanes>
              {() => (
                <>
                  <Specimen label="Bo góc">
                    {RADII.map((r) => (
                      <div key={r.cls} className="flex w-24 flex-col items-start gap-1.5">
                        <div className={`${r.cls} h-16 w-20 bg-surface-2`} />
                        <span className="text-xs text-fg tabular-nums">{r.label}</span>
                        <span className="text-xs text-muted">{r.use}</span>
                      </div>
                    ))}
                  </Specimen>
                  <Specimen label="Bóng: chỉ cho lớp phủ">
                    <div className="flex h-20 w-40 items-center justify-center rounded-lg bg-surface text-xs text-muted shadow-overlay">
                      shadow-overlay
                    </div>
                    <div className="flex h-20 w-40 items-center justify-center border-y border-border text-xs text-muted">
                      panel: đường kẻ
                    </div>
                  </Specimen>
                  <Specimen label="Khoảng cách (bội số 4 px)" className="flex-col items-start gap-1.5">
                    {SPACING.map((s) => (
                      <div key={s} className="flex items-center gap-3">
                        <span className="w-12 text-xs text-muted tabular-nums">{s * 4}px</span>
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
            description="Nút chính màu mực (đen trên nền sáng, trắng trên nền tối), mỗi bước chỉ một nút chính. Còn lại là secondary, outline, ghost hoặc liên kết gạch chân. Mọi nút có vòng focus 2 px."
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
                    <Input
                      className="tabular-nums"
                      defaultValue="25.000.000"
                      trailing="₫"
                      inputMode="numeric"
                    />
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
                  <Specimen label="Badge tabular-nums cho mã và số">
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
                    <div className="flex w-56 flex-col gap-3">
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
                          <Button>AI tư vấn cấu hình</Button>
                          <Button variant="outline">Xem linh kiện</Button>
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
                    label="ProductCard dạng danh sách: còn hàng, sắp hết, hết hàng"
                    className="grid items-start"
                  >
                    {[PRODUCTS[0], PRODUCTS[1], PRODUCTS[3]].map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        variant="list"
                        action={
                          <Button size="sm" variant="secondary" disabled={p.stock <= 0}>
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
                    <dl className="grid gap-px border-y border-border bg-border sm:grid-cols-3">
                      {[
                        { label: 'Doanh thu hôm nay', value: formatVnd(48_630_000) },
                        { label: 'Đơn chờ thanh toán', value: '7' },
                        { label: 'Hội thoại AI hôm nay', value: '132' },
                      ].map((s) => (
                        <div key={s.label} className="flex flex-col gap-1 bg-bg py-4 pe-5 sm:not-first:ps-5">
                          <dt className="text-sm text-muted">{s.label}</dt>
                          <dd className="text-xl font-semibold text-fg tabular-nums">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-6 border-y border-border">
                      <EmptyState
                        compact
                        icon={<PackageOpen />}
                        title="Chưa có đơn hàng mới"
                        description="Đơn mới sẽ hiện ở đây ngay khi khách thanh toán xong."
                      />
                    </div>
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
