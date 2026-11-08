import { cn } from '@/lib/cn';
import { formatVnd } from '@/lib/format';

const SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
} as const;

interface PriceProps {
  /** Integer VND. */
  amount: number;
  size?: keyof typeof SIZES;
  /** `muted` for secondary amounts, `strike` for the original price next to a sale price. */
  tone?: 'default' | 'muted' | 'strike' | 'accent';
  className?: string;
}

/** Money with tabular digits so columns of prices line up: "25.000.000₫". The đồng sign is set slightly smaller. */
export function Price({ amount, size = 'md', tone = 'default', className }: PriceProps) {
  const text = formatVnd(amount);
  const digits = text.slice(0, -1);
  return (
    <data
      value={amount}
      className={cn(
        'inline-flex items-baseline whitespace-nowrap font-semibold tabular-nums',
        SIZES[size],
        tone === 'default' && 'text-fg',
        tone === 'accent' && 'text-accent-ink',
        tone === 'muted' && 'font-medium text-muted',
        tone === 'strike' && 'font-normal text-muted line-through decoration-1',
        className,
      )}
    >
      {digits}
      <span className="ms-0.5 text-[0.78em] font-medium">₫</span>
    </data>
  );
}
