import { cn } from '@/lib/cn';

export type PerfTierKey = 'entry' | 'mainstream' | 'good' | 'strong' | 'flagship';

const TIERS: { min: number; key: PerfTierKey; label: string }[] = [
  { min: 90, key: 'flagship', label: 'Rất mạnh' },
  { min: 75, key: 'strong', label: 'Mạnh' },
  { min: 60, key: 'good', label: 'Khá' },
  { min: 40, key: 'mainstream', label: 'Phổ thông' },
  { min: 0, key: 'entry', label: 'Cơ bản' },
];

export function perfTier(score: number): { key: PerfTierKey; label: string } {
  const s = clamp(score);
  const t = TIERS.find((x) => s >= x.min)!;
  return { key: t.key, label: t.label };
}

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

interface PerfMeterProps {
  /** Engine score, 0–100. */
  score: number;
  /** What is measured, e.g. "Hiệu năng chơi game". */
  label?: string;
  /** Optional plain-language hint, e.g. "Khoảng 144 FPS ở 2K". */
  caption?: string;
  /** `sm` is a single inline row for build cards and slots. */
  size?: 'sm' | 'md';
  /** Light the segments one after another on mount. */
  animate?: boolean;
  className?: string;
}

/** A segmented "LED bar": one segment per 5 points, lit segments in the accent colour. */
export function PerfMeter({ score, label, caption, size = 'md', animate = true, className }: PerfMeterProps) {
  const value = clamp(score);
  const tier = perfTier(value);
  const count = size === 'sm' ? 10 : 20;
  const lit = Math.round((value / 100) * count);

  const bar = (
    <div className={cn('flex flex-1', size === 'sm' ? 'gap-0.5' : 'gap-[3px]')} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length segment list
          key={i}
          className={cn(
            'flex-1 rounded-[2px]',
            size === 'sm' ? 'h-2' : 'h-2.5',
            i < lit ? 'bg-accent shadow-(--led-shadow)' : 'bg-surface-3',
            i < lit && animate && 'animate-led-on',
          )}
          style={i < lit && animate ? { animationDelay: `${i * (size === 'sm' ? 40 : 28)}ms` } : undefined}
        />
      ))}
    </div>
  );

  const meterProps = {
    role: 'meter',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': value,
    'aria-valuetext': `${value}/100, ${tier.label}`,
    'aria-label': label ?? 'Điểm hiệu năng',
  } as const;

  if (size === 'sm') {
    return (
      <div {...meterProps} className={cn('flex min-w-0 items-center gap-2.5', className)}>
        <span className="w-7 font-mono text-sm font-semibold text-fg tabular-nums">{value}</span>
        {bar}
        <span className="shrink-0 text-xs font-medium text-muted">{tier.label}</span>
      </div>
    );
  }

  return (
    <div {...meterProps} className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-muted">{label ?? 'Điểm hiệu năng'}</span>
        <span className="shrink-0 font-mono tabular-nums">
          <span className="text-xl font-semibold text-fg">{value}</span>
          <span className="text-sm text-muted">/100</span>
        </span>
      </div>
      {bar}
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="shrink-0 font-semibold text-accent-ink">{tier.label}</span>
        {caption && <span className="text-end text-muted">{caption}</span>}
      </div>
    </div>
  );
}
