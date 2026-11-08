'use client';

import { BUILD_LABEL_TEXT, CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import Link from 'next/link';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { CATEGORY_COLOR } from '@/components/domain/category';
import { Price } from '@/components/ui/Price';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatVnd } from '@/lib/format';
import type { SampleBuild } from './server';

const number = new Intl.NumberFormat('vi-VN');

/**
 * The home hero's build sheet: what the engine actually picks for four example needs, itemised so the
 * prices visibly add up to the total. Switching examples refills the rows one after another.
 */
export function SampleSheet({ samples }: { samples: SampleBuild[] }) {
  const first = samples[0];
  if (!first) return null;
  return (
    <Tabs variant="line" defaultValue={first.need.id} className="min-w-0 gap-0">
      <TabsList aria-label="Ví dụ nhu cầu" className="gap-5">
        {samples.map((s) => (
          <TabsTrigger key={s.need.id} value={s.need.id}>
            {s.need.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {samples.map((s) => (
        <TabsContent key={s.need.id} value={s.need.id} className="pt-6">
          <Sheet sample={s} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function Sheet({ sample }: { sample: SampleBuild }) {
  const { build, need, stats } = sample;
  const byCategory = new Map(build.items.map((i) => [i.category, i.product]));
  const rows = CATEGORY_KEYS.flatMap((key) => {
    const product = byCategory.get(key);
    return product ? [{ key, product, price: product.salePrice ?? product.price }] : [];
  });
  const left = need.budget - build.totalPrice;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-medium text-fg">
          {build.label ? BUILD_LABEL_TEXT[build.label] : build.name}
        </span>
        <span className="text-muted tabular-nums">Ngân sách {formatVnd(need.budget)}</span>
      </div>

      <AllocationBar allocation={build.allocation} legend="none" size="sm" />

      <ul className="flex flex-col">
        {rows.map((r, i) => (
          <li
            key={r.key}
            className="grid animate-fade-in grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-border py-2 text-sm sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
            style={{ animationDelay: `${i * 45}ms`, animationFillMode: 'both' }}
          >
            <span className="flex items-center gap-2 text-muted">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: CATEGORY_COLOR[r.key] }}
              />
              <span className="truncate">{CATEGORY_LABELS[r.key]}</span>
            </span>
            <Link
              href={`/p/${r.product.slug}`}
              className="focus-ring truncate rounded-xs text-fg decoration-1 underline-offset-[3px] hover:underline"
            >
              {r.product.name}
            </Link>
            <span className="text-end tabular-nums text-fg">{number.format(r.price)}</span>
          </li>
        ))}
        <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t-2 border-fg pt-3">
          <span className="text-sm font-medium text-fg">
            Tổng {rows.length} linh kiện
            {left > 0 && (
              <span className="ms-2 font-normal text-muted tabular-nums">còn dư {formatVnd(left)}</span>
            )}
          </span>
          <Price amount={build.totalPrice} size="xl" />
        </li>
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-sm text-muted tabular-nums">
          Engine xét {number.format(stats.nodesExplored)} phương án trong{' '}
          {Math.max(1, Math.round(stats.timeMs))} ms.
        </p>
        <Link
          href={`/advisor?q=${encodeURIComponent(need.prompt)}`}
          className="focus-ring rounded-xs text-sm font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-current"
        >
          Hỏi tiếp về cấu hình này
        </Link>
      </div>
    </div>
  );
}
