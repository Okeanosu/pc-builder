'use client';

import { BUILD_LABEL_TEXT, type BuildDTO, CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import { FileDown, Link2, ShoppingCart, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { CompatibilityBadge } from '@/components/domain/CompatibilityBadge';
import { PerfMeter } from '@/components/domain/PerfMeter';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';
import { copyShareLink, quotePdfUrl, useAddBuildToCart } from './useBuildActions';

export function buildTitle(build: Pick<BuildDTO, 'label' | 'name'>): string {
  return build.label ? BUILD_LABEL_TEXT[build.label] : build.name;
}

interface BuildCardProps {
  build: BuildDTO;
  selected?: boolean;
  onSelect?: () => void;
  /** Position in a set, used to stagger the entrance. */
  index?: number;
  className?: string;
  style?: CSSProperties;
}

export function BuildCard({ build, selected, onSelect, index = 0, className, style }: BuildCardProps) {
  const addToCart = useAddBuildToCart();
  const title = buildTitle(build);
  const remaining = build.budget - build.totalPrice;
  const byCategory = new Map(build.items.map((i) => [i.category, i.product]));

  return (
    <Card
      variant={selected ? 'selected' : 'default'}
      className={cn('@container flex animate-card-in flex-col gap-4 p-4 sm:p-5', className)}
      style={{ animationDelay: `${index * 110}ms`, ...style }}
      aria-label={`Cấu hình ${title}`}
      role="group"
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="focus-ring -m-1 rounded-xs p-1"
          title="Đánh dấu cấu hình đang xem"
        >
          <Badge tone={build.label === 'balanced' || selected ? 'accent' : 'neutral'}>{title}</Badge>
        </button>
        <CompatibilityBadge size="sm" issues={build.warnings} />
      </div>

      <div className="flex flex-col gap-0.5">
        <Price amount={build.totalPrice} size="xl" />
        <span className={cn('text-xs', remaining >= 0 ? 'text-muted' : 'font-medium text-warn-ink')}>
          {remaining >= 0
            ? `Còn dư ${formatVnd(remaining)} so với ngân sách`
            : `Vượt ngân sách ${formatVnd(-remaining)}`}
        </span>
      </div>

      <PerfMeter size="sm" score={build.score} label={`Điểm hiệu năng cấu hình ${title}`} />
      <AllocationBar allocation={build.allocation} total={build.totalPrice} size="sm" legend="compact" />

      <ul className="flex flex-col gap-2 border-t border-border pt-3" aria-label="Linh kiện">
        {CATEGORY_KEYS.map((category) => {
          const p = byCategory.get(category);
          return (
            <li
              key={category}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 [grid-template-areas:'label_price'_'name_name'] @min-[25rem]:grid-cols-[5.5rem_minmax(0,1fr)_auto] @min-[25rem]:items-baseline @min-[25rem]:[grid-template-areas:'label_name_price']"
            >
              <span className="text-xs text-muted [grid-area:label]">{CATEGORY_LABELS[category]}</span>
              {p ? (
                <>
                  <span className="truncate text-sm font-medium text-fg [grid-area:name]" title={p.name}>
                    {p.name}
                  </span>
                  <span className="text-end font-mono text-xs text-muted tabular-nums [grid-area:price]">
                    {formatVnd(p.salePrice ?? p.price)}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted [grid-area:name]">
                  <span aria-hidden>—</span>
                  <span className="sr-only">Không có</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <div className="grid gap-2 @min-[30rem]:grid-cols-2">
          <Button asChild size="sm">
            <Link href={`/builder?build=${encodeURIComponent(build.id)}`}>
              <Wrench aria-hidden />
              Mở trong Customizer
            </Link>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={addToCart.isPending}
            onClick={() => addToCart.mutate(build)}
          >
            {!addToCart.isPending && <ShoppingCart aria-hidden />}
            Thêm cả bộ vào giỏ
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button asChild size="sm" variant="ghost" className="px-2 text-muted hover:text-fg">
            <a href={quotePdfUrl(build.id)} target="_blank" rel="noopener noreferrer">
              <FileDown aria-hidden />
              Báo giá PDF
            </a>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="px-2 text-muted hover:text-fg"
            onClick={() => void copyShareLink(build.id)}
          >
            <Link2 aria-hidden />
            Chia sẻ
          </Button>
        </div>
      </div>
    </Card>
  );
}
