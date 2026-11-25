import { type BuildItemDTO, CATEGORY_KEYS, CATEGORY_LABELS, type CategoryKey } from '@pc/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { CATEGORY_COLOR } from '@/components/domain/category';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';

const number = new Intl.NumberFormat('vi-VN');

/** Plain grouped digits for a sheet row ("3.190.000"); the currency sign is only on the total. */
export function formatSheetPrice(amount: number): string {
  return number.format(amount);
}

/** Category swatch + name: the first column of every build sheet row (home hero, advisor, customizer). */
export function CategoryLabel({ category, className }: { category: CategoryKey; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2 text-muted', className)}>
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-[2px]"
        style={{ backgroundColor: CATEGORY_COLOR[category] }}
      />
      <span className="truncate">{CATEGORY_LABELS[category]}</span>
    </span>
  );
}

/**
 * The heavy-ruled line that closes a build sheet: the part count, an optional muted note (budget left)
 * and the total. Needs an `@container` ancestor; the total grows from `lg` to `xl` once there is room.
 */
export function SheetTotal({
  label,
  note,
  amount,
  className,
}: {
  label: ReactNode;
  note?: ReactNode;
  amount: number;
  className?: string;
}) {
  return (
    // Wraps rather than squeezes: in a narrow column the total drops under the label, still flush right.
    <div className={cn('flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t-2 border-fg pt-3', className)}>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm font-medium text-fg">
        <span className="whitespace-nowrap">{label}</span>
        {note && <span className="font-normal text-muted tabular-nums">{note}</span>}
      </span>
      <Price amount={amount} size="lg" className="ms-auto @min-[22rem]:text-xl" />
    </div>
  );
}

/** Stacked (label + price, name below) in narrow columns; one line (label | name | price) from 22rem. */
const ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-border py-2 text-sm [grid-template-areas:'label_price'_'name_name'] @min-[22rem]:grid-cols-[5.5rem_minmax(0,1fr)_auto] @min-[22rem]:items-baseline @min-[22rem]:gap-x-4 @min-[22rem]:[grid-template-areas:'label_name_price'] @min-[34rem]:grid-cols-[7rem_minmax(0,1fr)_auto]";

interface BuildSheetProps {
  items: readonly BuildItemDTO[];
  /** Share of the total per category (BuildDTO.allocation), drawn as the bar on top. */
  allocation: Partial<Record<CategoryKey, number>>;
  total: number;
  /** List all eight categories, with a dash where the build has none, so sheets side by side line up. */
  allCategories?: boolean;
  /** Muted text after the part count on the total line, e.g. what is left of the budget. */
  totalNote?: ReactNode;
  /** Shown after a part's name, e.g. an out-of-stock mark. */
  partNote?: (item: BuildItemDTO) => ReactNode;
  className?: string;
}

/**
 * The build sheet, as on the home page: allocation bar, one hairline row per part (category, name, price)
 * and the total under a heavy rule. The same object in the advisor, the customizer and saved builds.
 */
export function BuildSheet({
  items,
  allocation,
  total,
  allCategories,
  totalNote,
  partNote,
  className,
}: BuildSheetProps) {
  const sorted = [...items].sort(
    (a, b) => CATEGORY_KEYS.indexOf(a.category) - CATEGORY_KEYS.indexOf(b.category),
  );
  const rows: { category: CategoryKey; item?: BuildItemDTO }[] = allCategories
    ? CATEGORY_KEYS.flatMap((category) => {
        const own = sorted.filter((i) => i.category === category);
        return own.length > 0 ? own.map((item) => ({ category, item })) : [{ category }];
      })
    : sorted.map((item) => ({ category: item.category, item }));

  return (
    <div className={cn('@container flex min-w-0 flex-col gap-4', className)}>
      <AllocationBar allocation={allocation} legend="none" size="sm" />
      <div className="flex flex-col">
        <ul className="flex flex-col" aria-label="Linh kiện">
          {rows.map(({ category, item }, i) => {
            const p = item?.product;
            const note = item && partNote?.(item);
            return (
              <li key={p ? `${category}-${p.id}` : `${category}-${i}`} className={ROW}>
                <CategoryLabel category={category} className="[grid-area:label]" />
                {p ? (
                  <>
                    <span className="flex min-w-0 items-baseline gap-2 [grid-area:name]">
                      <Link
                        href={`/p/${p.slug}`}
                        title={p.name}
                        className="focus-ring truncate rounded-xs text-fg decoration-1 underline-offset-[3px] hover:underline"
                      >
                        {p.name}
                      </Link>
                      {note}
                    </span>
                    <span className="text-end text-fg tabular-nums [grid-area:price]">
                      {formatSheetPrice(p.salePrice ?? p.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted [grid-area:name]">
                    <span aria-hidden>—</span>
                    <span className="sr-only">Không có</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <SheetTotal label={`Tổng ${sorted.length} linh kiện`} note={totalNote} amount={total} />
      </div>
    </div>
  );
}
