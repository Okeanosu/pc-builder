import { type Benchmark, CATEGORY_LABELS, type ProductDTO, type SpecField } from '@pc/shared';
import { PackageCheck, QrCode, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { PerfMeter } from '@/components/domain/PerfMeter';
import { SpecTable } from '@/components/domain/SpecTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatKeySpec, formatNumber } from '@/lib/format';
import { BuyBox } from './BuyBox';
import { ProductGallery } from './ProductGallery';

const BENCH_ROWS: { key: keyof Benchmark; label: string; versus: string }[] = [
  { key: 'cpuSingle', label: 'Hiệu năng đơn nhân', versus: 'CPU' },
  { key: 'cpuMulti', label: 'Hiệu năng đa nhân', versus: 'CPU' },
  { key: 'gpuScore', label: 'Hiệu năng đồ họa 3D', versus: 'card đồ họa' },
];

function BenchmarkBars({ benchmark, reference }: { benchmark: Benchmark; reference: Benchmark | null }) {
  const rows = BENCH_ROWS.flatMap((r) => {
    const value = benchmark[r.key];
    if (value === undefined) return [];
    const ref = reference?.[r.key];
    const score = ref ? Math.min(100, Math.round((value / ref) * 100)) : null;
    return [{ ...r, value, score }];
  });
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-6">
      {rows.map((r) =>
        r.score !== null ? (
          <PerfMeter
            key={r.key}
            score={r.score}
            label={r.label}
            caption={`Điểm ${formatNumber(r.value)} · so với ${r.versus} mạnh nhất cửa hàng`}
          />
        ) : (
          <div key={r.key} className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-muted">{r.label}</span>
            <span className="text-xl font-semibold text-fg tabular-nums">{formatNumber(r.value)}</span>
          </div>
        ),
      )}
      <p className="text-xs text-muted">
        Điểm benchmark tổng hợp dùng để chấm hiệu năng khi AI và bộ tối ưu chọn cấu hình. Thanh 100 là sản
        phẩm mạnh nhất cùng loại đang bán.
      </p>
    </div>
  );
}

const ASSURANCES = [
  { icon: <ShieldCheck aria-hidden />, text: 'Tự kiểm tra tương thích khi thêm vào cấu hình' },
  { icon: <PackageCheck aria-hidden />, text: 'Hàng được giữ 15 phút trong lúc chờ chuyển khoản' },
  { icon: <QrCode aria-hidden />, text: 'Thanh toán VietQR, xác nhận tự động' },
];

interface ProductDetailProps {
  product: ProductDTO;
  categoryName: string;
  specSchema: SpecField[];
  benchmarkReference: Benchmark | null;
}

export function ProductDetail({ product, categoryName, specSchema, benchmarkReference }: ProductDetailProps) {
  const chips = Object.entries(product.keySpecs)
    .map(([k, v]) => formatKeySpec(k, v))
    .filter((t): t is string => Boolean(t));
  const hasBench = Boolean(product.benchmark && Object.keys(product.benchmark).length > 0);
  // Fall back to raw spec keys so a product whose category schema failed to load still shows its specs.
  const fields: SpecField[] =
    specSchema.length > 0
      ? specSchema
      : Object.keys(product.specs).map((key) => ({
          key,
          label: key,
          type: 'string',
          required: false,
          filterable: false,
        }));
  const tabClass = 'data-[state=inactive]:hidden';

  return (
    <article className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-6 lg:py-8">
      <nav aria-label="Đường dẫn" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="focus-ring rounded-xs hover:text-fg">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href={`/c/${product.category}`} className="focus-ring rounded-xs hover:text-fg">
              {categoryName}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="min-w-0 truncate text-fg">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} alt={product.name} category={product.category} />

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">{product.brand}</span>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-balance text-fg">{product.name}</h1>
            <span className="tabular-nums text-xs text-muted">Mã SP: {product.sku}</span>
          </div>
          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Thông số nổi bật">
              {chips.map((c) => (
                <li
                  key={c}
                  className="rounded-xs border border-border bg-surface px-2 py-1 tabular-nums text-xs text-fg"
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
          <BuyBox product={product} />
          <ul className="grid gap-2.5 border-t border-border pt-5">
            {ASSURANCES.map((a) => (
              <li
                key={a.text}
                className="flex items-center gap-2.5 text-sm text-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-accent-ink"
              >
                {a.icon}
                {a.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Tabs variant="line" defaultValue="specs">
        <TabsList aria-label="Thông tin sản phẩm">
          <TabsTrigger value="specs">Thông số kỹ thuật</TabsTrigger>
          {hasBench && <TabsTrigger value="bench">Hiệu năng</TabsTrigger>}
          <TabsTrigger value="desc">Mô tả</TabsTrigger>
        </TabsList>
        {/* forceMount keeps every tab in the server HTML for search engines; inactive ones are hidden. */}
        <TabsContent value="specs" forceMount className={tabClass}>
          <SpecTable
            fields={fields}
            specs={product.specs}
            caption={`Thông số ${CATEGORY_LABELS[product.category]}`}
            className="max-w-3xl"
          />
        </TabsContent>
        {hasBench && product.benchmark && (
          <TabsContent value="bench" forceMount className={tabClass}>
            <div className="max-w-xl rounded-md border border-border bg-surface p-5">
              <BenchmarkBars benchmark={product.benchmark} reference={benchmarkReference} />
            </div>
          </TabsContent>
        )}
        <TabsContent value="desc" forceMount className={tabClass}>
          <p className="max-w-3xl text-base text-fg">
            {product.description ??
              `${product.name} của ${product.brand}. Xem bảng thông số để biết chi tiết.`}
          </p>
        </TabsContent>
      </Tabs>
    </article>
  );
}
