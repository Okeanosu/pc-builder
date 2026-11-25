import { BUILD_LABEL_TEXT, type BuildDTO, type CompatibilityIssueDTO, PURPOSE_LABELS } from '@pc/shared';
import { Gauge, OctagonX, TriangleExclamationPoint } from 'lucide-react';
import Link from 'next/link';
import { CompatibilityBadge } from '@/components/domain/CompatibilityBadge';
import { PerfMeter } from '@/components/domain/PerfMeter';
import { Badge } from '@/components/ui/Badge';
import { BuildSheet } from '@/features/advisor/BuildSheet';
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
    <ul className="flex flex-col gap-2" aria-label="Vấn đề tương thích">
      {sorted.map((i) => (
        <li key={`${i.code}-${i.message}`} className="flex items-start gap-2 text-sm">
          {i.severity === 'error' ? (
            <OctagonX className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden />
          ) : (
            <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-warn-ink" aria-hidden />
          )}
          <span className="min-w-0 text-fg">
            <span
              className={cn(
                'me-1.5 font-semibold tabular-nums',
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
  const outOfStock = build.items.filter((i) => i.product.stock <= 0);
  const left = build.budget > 0 ? build.budget - build.totalPrice : null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex flex-col gap-4">
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
          <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-balance text-fg sm:text-3xl">
            {build.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {build.label && <Badge tone="solid">{BUILD_LABEL_TEXT[build.label]}</Badge>}
            <Badge tone="neutral">{PURPOSE_LABELS[build.purpose]}</Badge>
            <CompatibilityBadge issues={build.warnings} size="sm" />
            <p className="text-sm text-muted">
              {SOURCE_TEXT[build.source]} · {dateFmt.format(new Date(build.createdAt))} · {build.items.length}{' '}
              linh kiện
            </p>
          </div>
        </header>
      </div>

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <section aria-labelledby="build-parts" className="flex min-w-0 flex-col gap-4">
          <h2 id="build-parts" className="text-lg font-semibold text-fg">
            Danh sách linh kiện
          </h2>
          <BuildSheet
            items={build.items}
            allocation={build.allocation}
            total={build.totalPrice}
            totalNote={
              left !== null &&
              (left >= 0 ? (
                `ngân sách ${formatVnd(build.budget)}, còn dư ${formatVnd(left)}`
              ) : (
                <span className="font-medium text-warn-ink">
                  vượt ngân sách {formatVnd(build.budget)} khoảng {formatVnd(-left)}
                </span>
              ))
            }
            partNote={(item) =>
              item.product.stock <= 0 && (
                <span className="shrink-0 text-xs font-medium text-danger-ink">Hết hàng</span>
              )
            }
          />
        </section>

        <aside aria-label="Tổng quan cấu hình" className="flex flex-col gap-6 lg:sticky lg:top-32">
          <PerfMeter score={build.score} label={`Điểm hiệu năng · ${PURPOSE_LABELS[build.purpose]}`} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-border pt-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Gauge className="size-4" aria-hidden />
              Công suất ước tính
            </span>
            <span className="text-fg tabular-nums">
              ~{build.estimatedWattage}W
              <span className="text-muted"> · nên dùng nguồn từ {build.recommendedPsuWattage}W</span>
            </span>
          </div>
          {build.warnings.length > 0 && (
            <div className="border-t border-border pt-4">
              <IssueList issues={build.warnings} />
            </div>
          )}
          {outOfStock.length > 0 && (
            <p className="rounded-sm border border-warn/45 bg-warn/10 px-3 py-2.5 text-sm text-fg">
              {outOfStock.map((i) => i.product.name).join(', ')} đang hết hàng nên chưa mua cả bộ được. Hãy
              hỏi AI tư vấn hoặc tự lắp để chọn linh kiện thay thế còn hàng.
            </p>
          )}
          <div className="border-t border-border pt-4">
            <BuildActions buildId={build.id} buyable={outOfStock.length === 0} />
          </div>
        </aside>
      </div>
    </div>
  );
}
