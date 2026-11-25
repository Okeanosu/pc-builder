import Link from 'next/link';
import { cn } from '@/lib/cn';

export const BRAND_NAME = 'PC Builder';

/** Share of a typical 25-million gaming build per category, in mark order. The mark is a budget split. */
const MARK_SPLIT: Array<[string, number]> = [
  ['cpu', 15],
  ['mainboard', 8],
  ['ram', 8],
  ['gpu', 38],
  ['storage', 8],
  ['psu', 9],
  ['case', 8],
  ['cooler', 6],
];

/** Eight vertical bands in the category colours, sized like a real budget split (GPU widest). */
export function LogoMark({ className }: { className?: string }) {
  let x = 0;
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn('size-6 shrink-0', className)}>
      <defs>
        <clipPath id="logo-mark-clip">
          <rect width={100} height={100} rx={18} />
        </clipPath>
      </defs>
      <g clipPath="url(#logo-mark-clip)">
        {MARK_SPLIT.map(([key, share]) => {
          const band = (
            <rect key={key} x={x} y={0} width={share + 0.5} height={100} fill={`var(--color-cat-${key})`} />
          );
          x += share;
          return band;
        })}
      </g>
    </svg>
  );
}

interface LogoProps {
  href?: string;
  /** Hide the wordmark below `sm` to save room in tight headers. */
  compact?: boolean;
  className?: string;
}

export function Logo({ href = '/', compact, className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn('focus-ring inline-flex shrink-0 items-center gap-2.5 rounded-xs text-fg', className)}
      aria-label={`${BRAND_NAME}, về trang chủ`}
    >
      <LogoMark />
      <span
        className={cn(
          'text-lg font-bold font-stretch-expanded tracking-[-0.03em]',
          compact && 'max-sm:sr-only',
        )}
      >
        {BRAND_NAME}
      </span>
    </Link>
  );
}
