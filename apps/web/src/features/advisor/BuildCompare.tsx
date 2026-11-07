'use client';

import { type BuildDTO, PURPOSE_LABELS } from '@pc/shared';
import { Cpu } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';
import { BuildCard } from './BuildCard';

interface BuildCompareProps {
  builds: BuildDTO[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The engine is still choosing parts for the current turn. */
  pending?: boolean;
  className?: string;
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <Card
      className="flex w-[min(20rem,85cqw)] shrink-0 animate-card-in snap-start flex-col gap-4 p-5 @min-[44rem]:w-auto"
      style={{ animationDelay: `${index * 110}ms` }}
    >
      <div className="flex justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-2 w-full" />
      <div className="flex flex-col gap-2.5 border-t border-border pt-3">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
          <Skeleton key={i} className="h-3.5 w-full" />
        ))}
      </div>
      <Skeleton className="h-8 w-full" />
    </Card>
  );
}

export function BuildCompare({ builds, selectedId, onSelect, pending, className }: BuildCompareProps) {
  const head = builds[0];
  return (
    <section
      aria-labelledby="build-compare-title"
      className={cn('@container flex flex-col gap-4', className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <h2 id="build-compare-title" className="text-lg font-semibold text-fg">
            So sánh cấu hình
          </h2>
          <p className="text-sm text-muted">
            {head
              ? `${PURPOSE_LABELS[head.purpose]} · ngân sách ${formatVnd(head.budget)}`
              : 'Ba phương án từ hàng có sẵn: hiệu năng, cân bằng, tiết kiệm'}
          </p>
        </div>
        {pending && (
          <span className="inline-flex items-center gap-2 text-sm text-accent-ink" role="status">
            <Spinner size="sm" label={null} />
            Đang chọn linh kiện trong kho…
          </span>
        )}
      </div>

      {pending ? (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 @min-[44rem]:mx-0 @min-[44rem]:grid @min-[44rem]:grid-cols-3 @min-[44rem]:overflow-visible @min-[44rem]:px-0">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : builds.length === 0 ? (
        <Card className="border-dashed bg-transparent">
          <EmptyState
            icon={<Cpu />}
            title="Cấu hình sẽ hiện ở đây"
            description="Nhập nhu cầu và ngân sách, ví dụ “chơi game 25 triệu”. Ba cấu hình tương thích, chọn từ hàng trong kho, sẽ xếp cạnh nhau để so sánh."
          />
        </Card>
      ) : (
        <div
          key={builds.map((b) => b.id).join()}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-4 pb-1 @min-[44rem]:mx-0 @min-[44rem]:grid @min-[44rem]:grid-cols-3 @min-[44rem]:overflow-visible @min-[44rem]:px-0"
        >
          {builds.map((b, i) => (
            <BuildCard
              key={b.id}
              build={b}
              index={i}
              selected={b.id === selectedId}
              onSelect={() => onSelect(b.id)}
              className="w-[min(20rem,85cqw)] shrink-0 snap-start @min-[44rem]:w-auto"
            />
          ))}
        </div>
      )}
    </section>
  );
}
