import Link from 'next/link';
import { cn } from '@/lib/cn';

export const BRAND_NAME = 'PC Builder';

/** Chip glyph: package outline and contacts in the text colour, die in Electric Cyan. */
export function LogoMark({ className }: { className?: string }) {
  const ticks = [9, 14, 19];
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden className={cn('size-7 shrink-0', className)}>
      {ticks.map((p) => (
        <g key={p} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
          <line x1={p} y1={1.5} x2={p} y2={4} />
          <line x1={p} y1={24} x2={p} y2={26.5} />
          <line x1={1.5} y1={p} x2={4} y2={p} />
          <line x1={24} y1={p} x2={26.5} y2={p} />
        </g>
      ))}
      <rect x={5.5} y={5.5} width={17} height={17} rx={3} stroke="currentColor" strokeWidth={1.8} />
      <path d="M10 10h8v8h-6l-2-2z" fill="var(--color-cyan)" />
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
      className={cn('focus-ring inline-flex shrink-0 items-center gap-2 rounded-xs text-fg', className)}
      aria-label={`${BRAND_NAME}, về trang chủ`}
    >
      <LogoMark />
      <span className={cn('text-lg font-extrabold tracking-[-0.02em]', compact && 'max-sm:sr-only')}>
        {BRAND_NAME}
      </span>
    </Link>
  );
}
