import { Badge } from '@/components/ui/Badge';
import { Price } from '@/components/ui/Price';
import { cn } from '@/lib/cn';

const SIZES = {
  sm: { main: 'md', old: 'sm' },
  md: { main: 'lg', old: 'sm' },
  lg: { main: '2xl', old: 'md' },
} as const;

interface PriceTagProps {
  price: number;
  salePrice?: number | null;
  size?: keyof typeof SIZES;
  /** `stacked`: sale price above, original + discount below. `inline`: one wrapping row. */
  layout?: 'stacked' | 'inline';
  className?: string;
}

export function discountPercent(price: number, salePrice: number | null | undefined): number | null {
  if (!salePrice || salePrice >= price || price <= 0) return null;
  return Math.round((1 - salePrice / price) * 100);
}

export function PriceTag({ price, salePrice, size = 'md', layout = 'stacked', className }: PriceTagProps) {
  const off = discountPercent(price, salePrice);
  const s = SIZES[size];
  const current = off !== null && salePrice ? salePrice : price;
  const original = off !== null && (
    <span className="inline-flex items-center gap-1.5">
      <span className="sr-only">Giá gốc</span>
      <Price amount={price} size={s.old} tone="strike" />
      <Badge tone="accent" size="sm" mono>
        -{off}%
      </Badge>
    </span>
  );
  return (
    <div
      className={cn(
        'flex',
        layout === 'stacked' ? 'flex-col items-start gap-0.5' : 'flex-wrap items-baseline gap-x-2.5 gap-y-1',
        className,
      )}
    >
      {off !== null && <span className="sr-only">Giá khuyến mãi</span>}
      <Price amount={current} size={s.main} />
      {original}
    </div>
  );
}
