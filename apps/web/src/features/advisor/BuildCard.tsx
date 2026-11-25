'use client';

import { BUILD_LABEL_TEXT, type BuildDTO } from '@pc/shared';
import { FileDown, Link2, ShoppingCart, Wrench } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CompatibilityBadge } from '@/components/domain/CompatibilityBadge';
import { PerfMeter } from '@/components/domain/PerfMeter';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';
import { BuildSheet } from './BuildSheet';
import { copyShareLink, quotePdfUrl, useAddBuildToCart } from './useBuildActions';

export function buildTitle(build: Pick<BuildDTO, 'label' | 'name'>): string {
  return build.label ? BUILD_LABEL_TEXT[build.label] : build.name;
}

interface BuildCardProps {
  build: BuildDTO;
  selected?: boolean;
  onSelect?: () => void;
  /** @deprecated Cards no longer stagger their entrance; kept so call sites compile. */
  index?: number;
  className?: string;
  style?: CSSProperties;
}

/** One build as a sheet in a frame; the selected build gets the ink frame. */
export function BuildCard({ build, selected, onSelect, className, style }: BuildCardProps) {
  const addToCart = useAddBuildToCart();
  const title = buildTitle(build);
  const remaining = build.budget - build.totalPrice;

  return (
    <Card
      variant={selected ? 'selected' : 'default'}
      className={cn('@container flex animate-fade-in flex-col gap-4 p-4 sm:p-5', className)}
      style={style}
      aria-label={`Cấu hình ${title}`}
      role="group"
    >
      {/* Stacked in narrow columns so the three sheets side by side keep their rows level. */}
      <div className="flex flex-col items-start gap-2 @min-[20rem]:flex-row @min-[20rem]:items-center @min-[20rem]:justify-between">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="focus-ring -m-1 min-w-0 rounded-xs p-1 text-start text-base font-semibold text-fg"
          title="Đánh dấu cấu hình đang xem"
        >
          {title}
        </button>
        <CompatibilityBadge size="sm" issues={build.warnings} />
      </div>

      <PerfMeter size="sm" score={build.score} label={`Điểm hiệu năng cấu hình ${title}`} />

      <BuildSheet
        items={build.items}
        allocation={build.allocation}
        total={build.totalPrice}
        allCategories
        totalNote={
          build.budget > 0 &&
          (remaining >= 0 ? (
            `còn dư ${formatVnd(remaining)}`
          ) : (
            <span className="font-medium text-warn-ink">vượt ngân sách {formatVnd(-remaining)}</span>
          ))
        }
      />

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
        <div className="flex flex-wrap gap-1">
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
