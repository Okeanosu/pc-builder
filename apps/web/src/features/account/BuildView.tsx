import {
  BUILD_LABEL_TEXT,
  type BuildDTO,
  CATEGORY_KEYS,
  CATEGORY_LABELS,
  type CategoryKey,
  type CompatibilityIssueDTO,
  PURPOSE_LABELS,
} from '@pc/shared';
import { OctagonX, TriangleExclamationPoint, Zap } from 'lucide-react';
import Link from 'next/link';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { CompatibilityBadge } from '@/components/domain/CompatibilityBadge';
import { CATEGORY_DESIGNATOR } from '@/components/domain/category';
import { PerfMeter } from '@/components/domain/PerfMeter';
import { ProductCard } from '@/components/domain/ProductCard';
import { Badge } from '@/components/ui/Badge';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';
import { BuildActions } from '../cart/BuildActions';

const dateFmt = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' });

const SOURCE_TEXT: Record<BuildDTO['source'], string> = {
  CHAT: 'Do AI tư vấn đề xuất',
  FORM: 'Do bộ tối ưu đề xuất',
  CUSTOM: 'Tự lắp trong Customizer',
};

export function IssueList({ issues }: { issues: readonly CompatibilityIssueDTO[] }) {
  if (issues.length === 0) return null;
  const sorted = [...issues].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1,
  );
  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((i) => (
        <li
          key={`${i.code}-${i.message}`}
          className={cn(
            'flex items-start gap-2.5 rounded-sm border px-3 py-2.5 text-sm',
            i.severity === 'error' ? 'border-danger/40 bg-danger/8' : 'border-warn/45 bg-warn/10',
          )}
        >
          {i.severity === 'error' ? (
            <OctagonX className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden />
          ) : (
            <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
          )}
          <span className="min-w-0 text-fg">
            <span
              className={cn(
                'me-1.5 font-mono text-xs font-semibold',
                i.severity === 'error' ? 'text-danger-ink' : 'text-warn-ink',
              )}
            >
              {i.code}
            </span>
            {i.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function BuildView({ build }: { build: BuildDTO }) {
  const items = [...build.items].sort(
    (a, b) => CATEGORY_KEYS.indexOf(a.category) - CATEGORY_KEYS.indexOf(b.category),
  );
  const outOfStock = items.filter((i) => i.product.stock <= 0);
  const amounts: Partial<Record<CategoryKey, number>> = {};
  for (const i of items) {
    amounts[i.category] = (amounts[i.category] ?? 0) + (i.product.salePrice ?? i.product.price);
  }
  const left = build.budget > 0 ? build.budget - build.totalPrice : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
      <nav aria-label="Đường dẫn" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="focus-ring rounded-xs hover:text-fg">
              Trang chủ
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-fg">
            Cấu hình chia sẻ
          </li>
        </ol>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {build.label && <Badge tone="solid">{BUILD_LABEL_TEXT[build.label]}</Badge>}
          <Badge tone="neutral">{PURPOSE_LABELS[build.purpose]}</Badge>
          <CompatibilityBadge issues={build.warnings} size="sm" />
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-balance text-fg">{build.name}</h1>
        <p className="text-sm text-muted">
          {SOURCE_TEXT[build.source]} · {dateFmt.format(new Date(build.createdAt))} · {items.length} linh kiện
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-8">
        <section aria-labelledby="build-parts" className="flex flex-col gap-3">
          <h2 id="build-parts" className="sr-only">
            Danh sách linh kiện
          </h2>
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => (
              <li key={`${item.category}-${item.product.id}`} className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wide text-muted">
                  {CATEGORY_DESIGNATOR[item.category]}
                  <span className="font-sans font-medium tracking-normal">
                    · {CATEGORY_LABELS[item.category]}
                  </span>
                </span>
                <ProductCard product={item.product} variant="list" />
              </li>
            ))}
          </ul>
        </section>

        <aside
          aria-label="Tổng quan cấu hình"
          className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-32"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted">Tổng cộng</span>
            <Price amount={build.totalPrice} size="2xl" />
            {left !== null && (
              <span className={cn('text-sm', left >= 0 ? 'text-muted' : 'font-medium text-warn-ink')}>
                {left >= 0
                  ? `Ngân sách ${formatVnd(build.budget)} · còn dư ${formatVnd(left)}`
                  : `Vượt ngân sách ${formatVnd(build.budget)} khoảng ${formatVnd(-left)}`}
              </span>
            )}
          </div>
          <PerfMeter score={build.score} label={`Điểm hiệu năng · ${PURPOSE_LABELS[build.purpose]}`} />
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted">Phân bổ ngân sách</span>
            <AllocationBar
              allocation={build.allocation}
              amounts={amounts}
              total={build.totalPrice}
              legend="full"
            />
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Zap className="size-4 shrink-0 text-accent-ink" aria-hidden />
            <span>
              Công suất ước tính <span className="font-mono text-fg">~{build.estimatedWattage}W</span> · nên
              dùng nguồn từ <span className="font-mono text-fg">{build.recommendedPsuWattage}W</span>
            </span>
          </p>
          <IssueList issues={build.warnings} />
          {outOfStock.length > 0 && (
            <p className="rounded-sm border border-warn/45 bg-warn/10 px-3 py-2.5 text-sm text-fg">
              {outOfStock.map((i) => i.product.name).join(', ')} đang hết hàng nên chưa mua cả bộ được. Hãy
              hỏi AI tư vấn hoặc tự lắp để chọn linh kiện thay thế còn hàng.
            </p>
          )}
          <BuildActions buildId={build.id} buyable={outOfStock.length === 0} />
        </aside>
      </div>
    </div>
  );
}
