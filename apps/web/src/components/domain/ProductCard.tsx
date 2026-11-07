import type { ProductSummaryDTO } from '@pc/shared';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatKeySpec } from '@/lib/format';
import { PriceTag } from './PriceTag';
import { ProductImage } from './ProductImage';

export type StockState = 'in' | 'low' | 'out';

export function stockState(stock: number): StockState {
  if (stock <= 0) return 'out';
  return stock <= 5 ? 'low' : 'in';
}

function StockLine({ stock }: { stock: number }) {
  const state = stockState(stock);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        state === 'in' && 'text-ok-ink',
        state === 'low' && 'text-warn-ink',
        state === 'out' && 'text-muted',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          state === 'in' && 'bg-ok',
          state === 'low' && 'bg-warn',
          state === 'out' && 'bg-border-strong',
        )}
      />
      {state === 'in' ? 'Còn hàng' : state === 'low' ? `Chỉ còn ${stock}` : 'Hết hàng'}
    </span>
  );
}

interface ProductCardProps {
  product: ProductSummaryDTO;
  /** Defaults to /p/{slug}. */
  href?: string;
  /** Buttons rendered above the card link, e.g. "Thêm vào giỏ" or "Chọn". */
  action?: ReactNode;
  /** `grid` for catalogue pages; `list` for pickers and search results. */
  variant?: 'grid' | 'list';
  /** Max number of keySpecs chips. */
  maxSpecs?: number;
  className?: string;
}

export function ProductCard({
  product,
  href = `/p/${product.slug}`,
  action,
  variant = 'grid',
  maxSpecs = 3,
  className,
}: ProductCardProps) {
  const chips = Object.entries(product.keySpecs)
    .map(([k, v]) => formatKeySpec(k, v))
    .filter((t): t is string => Boolean(t))
    .slice(0, maxSpecs);
  const out = product.stock <= 0;

  const title = (
    <Link
      href={href}
      className="text-sm font-semibold text-fg outline-none after:absolute after:inset-0 after:rounded-md hover:text-accent-ink"
    >
      <span className="line-clamp-2">{product.name}</span>
    </Link>
  );
  const specChips = chips.length > 0 && (
    <ul className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <li
          key={c}
          className="whitespace-nowrap rounded-xs bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted"
        >
          {c}
        </li>
      ))}
    </ul>
  );

  if (variant === 'list') {
    return (
      <article
        className={cn(
          '@container relative rounded-md border border-border bg-surface p-3 transition-[border-color,box-shadow] duration-150 hover:border-border-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring',
          className,
        )}
      >
        <div className="flex items-start gap-3 @min-[26rem]:items-center @min-[26rem]:gap-4">
          <ProductImage
            src={product.image}
            alt={product.name}
            category={product.category}
            designator={false}
            sizes="96px"
            className={cn('w-20 shrink-0 @min-[26rem]:w-24', out && 'opacity-60')}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 @min-[26rem]:flex-row @min-[26rem]:items-center @min-[26rem]:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">{product.brand}</span>
              {title}
              {specChips}
            </div>
            <div className="flex items-end justify-between gap-3 @min-[26rem]:shrink-0 @min-[26rem]:flex-col @min-[26rem]:gap-2">
              <div className="flex flex-col gap-1 @min-[26rem]:items-end">
                <PriceTag
                  price={product.price}
                  salePrice={product.salePrice}
                  size="sm"
                  className="@min-[26rem]:items-end"
                />
                <StockLine stock={product.stock} />
              </div>
              {action && <div className="relative z-10 shrink-0">{action}</div>}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded-md border border-border bg-surface transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring',
        className,
      )}
    >
      <ProductImage
        src={product.image}
        alt={product.name}
        category={product.category}
        className={cn('rounded-none', out && 'opacity-60')}
      />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted">{product.brand}</span>
          <StockLine stock={product.stock} />
        </div>
        {title}
        {specChips}
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <PriceTag price={product.price} salePrice={product.salePrice} size="sm" />
          {action && <div className="relative z-10 shrink-0">{action}</div>}
        </div>
      </div>
    </article>
  );
}
