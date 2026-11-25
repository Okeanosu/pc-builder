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
        'shrink-0 text-xs',
        state === 'in' && 'text-ok-ink',
        state === 'low' && 'font-medium text-warn-ink',
        state === 'out' && 'text-muted',
      )}
    >
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
      className="text-[0.9375rem] leading-snug font-medium text-fg outline-none decoration-1 underline-offset-[3px] after:absolute after:inset-0 after:rounded-md group-hover:underline"
    >
      <span className="line-clamp-2">{product.name}</span>
    </Link>
  );
  // Key specs read as one plain line ("AM5, 16 nhân, 32 luồng"), not chips.
  const specLine = chips.length > 0 && (
    <p className="truncate text-sm text-muted tabular-nums" title={chips.join(', ')}>
      {chips.join(', ')}
    </p>
  );

  if (variant === 'list') {
    return (
      <article
        className={cn(
          '@container group relative min-w-0 rounded-md border border-border bg-surface p-3 transition-[border-color] duration-150 hover:border-border-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring',
          className,
        )}
      >
        <div className="flex items-start gap-3 @min-[26rem]:items-center @min-[26rem]:gap-4">
          <ProductImage
            src={product.image}
            alt={product.name}
            category={product.category}
            sizes="96px"
            className={cn('w-20 shrink-0 @min-[26rem]:w-24', out && 'opacity-60')}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 @min-[26rem]:flex-row @min-[26rem]:items-center @min-[26rem]:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs text-muted">{product.brand}</span>
              {title}
              {specLine}
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
        'group relative flex min-w-0 flex-col gap-3 rounded-md has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ring',
        className,
      )}
    >
      <ProductImage
        src={product.image}
        alt={product.name}
        category={product.category}
        className={cn('group-hover:bg-surface-3', out && 'opacity-60')}
      />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs text-muted">{product.brand}</span>
          <StockLine stock={product.stock} />
        </div>
        {title}
        {specLine}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <PriceTag price={product.price} salePrice={product.salePrice} size="sm" />
          {action && <div className="relative z-10 shrink-0">{action}</div>}
        </div>
      </div>
    </article>
  );
}
