import { cn } from '@/lib/cn';

const SIZES = { sm: 'size-4', md: 'size-5', lg: 'size-8' } as const;

interface SpinnerProps {
  size?: keyof typeof SIZES;
  /** Screen-reader text; pass `null` when a parent already announces the busy state. */
  label?: string | null;
  className?: string;
}

export function Spinner({ size = 'md', label = 'Đang tải', className }: SpinnerProps) {
  const svg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn(
        'shrink-0 animate-spin text-current',
        SIZES[size],
        label !== null ? undefined : className,
      )}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
  if (label === null) return svg;
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
