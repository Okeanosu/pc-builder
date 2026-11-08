'use client';

import { type BuildDTO, PURPOSE_LABELS } from '@pc/shared';
import { Cpu } from 'lucide-react';
import type { ReactNode } from 'react';
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
  /** Small chip beside the title (e.g. "từ bộ nhớ đệm"). */
  badge?: ReactNode;
  /** Copy for the empty panel; defaults to the chat wording. */
  empty?: { title: string; description: string };
  /** Shown instead of the empty panel, e.g. why a search found nothing. */
  emptySlot?: ReactNode;
  className?: string;
}

const CHAT_EMPTY = {
  title: 'Cấu hình sẽ hiện ở đây',
  description:
    'Nhập nhu cầu và ngân sách, ví dụ “chơi game 25 triệu”. Ba cấu hình tương thích, chọn từ hàng trong kho, sẽ xếp cạnh nhau để so sánh.',
};

function SkeletonCard() {
  return (
    <Card className="flex w-[min(20rem,85cqw)] shrink-0 snap-start flex-col gap-4 p-4 sm:p-5 @min-[44rem]:w-auto">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-1 w-full" />
      <Skeleton className="h-2 w-full" />
      <div className="flex flex-col">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
          <div key={i} className="flex flex-col gap-1.5 border-b border-border py-2">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-14" />
            </div>
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t-2 border-border pt-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-full" />
    </Card>
  );
}

export function BuildCompare({
  builds,
  selectedId,
  onSelect,
  pending,
  badge,
  empty = CHAT_EMPTY,
  emptySlot,
  className,
}: BuildCompareProps) {
  const head = builds[0];
  return (
    <section
      aria-labelledby="build-compare-title"
      className={cn('@container flex flex-col gap-4', className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="build-compare-title" className="text-lg font-semibold text-fg">
              So sánh cấu hình
            </h2>
            {!pending && badge}
          </div>
          <p className="text-sm text-muted">
            {head
              ? `${PURPOSE_LABELS[head.purpose]} · ngân sách ${formatVnd(head.budget)}`
              : 'Ba phương án từ hàng có sẵn: hiệu năng, cân bằng, tiết kiệm'}
          </p>
        </div>
        {pending && (
          <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
            <Spinner size="sm" label={null} />
            Đang chọn linh kiện trong kho…
          </span>
        )}
      </div>

      {pending ? (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 @min-[44rem]:mx-0 @min-[44rem]:grid @min-[44rem]:grid-cols-3 @min-[44rem]:overflow-visible @min-[44rem]:px-0">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : builds.length === 0 ? (
        (emptySlot ?? (
          <EmptyState
            icon={<Cpu />}
            title={empty.title}
            description={empty.description}
            className="border-y border-border"
          />
        ))
      ) : (
        <div
          key={builds.map((b) => b.id).join()}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 items-stretch gap-4 overflow-x-auto px-4 pb-1 @min-[44rem]:mx-0 @min-[44rem]:grid @min-[44rem]:grid-cols-3 @min-[44rem]:overflow-visible @min-[44rem]:px-0"
        >
          {builds.map((b) => (
            <BuildCard
              key={b.id}
              build={b}
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
