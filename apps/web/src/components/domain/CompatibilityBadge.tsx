'use client';

import type { CompatibilityIssueDTO } from '@pc/shared';
import { CircleCheck, OctagonX, TriangleExclamationPoint } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';

export type CompatibilityStatus = 'ok' | 'warning' | 'error';
type Issue = Pick<CompatibilityIssueDTO, 'code' | 'severity' | 'message'>;

/** Worst severity wins: any error → "error", else any warning → "warning", else "ok". */
export function getCompatibilityStatus(issues: readonly Pick<Issue, 'severity'>[]): CompatibilityStatus {
  if (issues.some((i) => i.severity === 'error')) return 'error';
  if (issues.some((i) => i.severity === 'warning')) return 'warning';
  return 'ok';
}

const STATUS = {
  ok: {
    Icon: CircleCheck,
    label: 'Tương thích',
    noun: '',
    className: 'border-ok/45 bg-ok/16 text-ok-ink',
  },
  warning: {
    Icon: TriangleExclamationPoint,
    label: 'Cảnh báo',
    noun: 'cảnh báo',
    className: 'border-warn/45 bg-warn/14 text-warn-ink',
  },
  error: {
    Icon: OctagonX,
    label: 'Xung đột',
    noun: 'xung đột',
    className: 'border-danger/45 bg-danger/12 text-danger-ink',
  },
} as const;

interface CompatibilityBadgeProps {
  /** Derived from `issues` when omitted. */
  status?: CompatibilityStatus;
  /** Rule violations shown in the tooltip with their rule code (C01–C14). */
  issues?: readonly Issue[];
  size?: 'sm' | 'md';
  /** Overrides the default label ("Tương thích" / "Cảnh báo" / "Xung đột"). */
  label?: string;
  /** Show the tooltip without hover (design previews, onboarding hints). */
  tooltipOpen?: boolean;
  className?: string;
}

export function CompatibilityBadge({
  status: statusProp,
  issues = [],
  size = 'md',
  label,
  tooltipOpen,
  className,
}: CompatibilityBadgeProps) {
  const status = statusProp ?? getCompatibilityStatus(issues);
  const meta = STATUS[status];
  const relevant =
    status === 'ok'
      ? []
      : [...issues].sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'));
  const counted = relevant.filter((i) => i.severity === (status === 'error' ? 'error' : 'warning')).length;
  const text = label ?? (counted > 1 ? `${counted} ${meta.noun}` : meta.label);

  const badge = (
    <button
      type="button"
      className={cn(
        'focus-ring inline-flex shrink-0 cursor-help items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold',
        size === 'sm' ? 'h-6 px-2 text-xs [&_svg]:size-3.5' : 'h-7 px-2.5 text-sm [&_svg]:size-4',
        meta.className,
        className,
      )}
    >
      <meta.Icon className="[filter:var(--led-glow)]" aria-hidden />
      {text}
    </button>
  );

  const content =
    relevant.length === 0 ? (
      <span>Các linh kiện đã chọn không vi phạm luật tương thích nào.</span>
    ) : (
      <ul className="flex flex-col gap-1.5">
        {relevant.map((i) => (
          <li key={`${i.code}-${i.message}`} className="flex gap-2">
            <span className="font-mono font-semibold">{i.code}</span>
            <span>{i.message}</span>
          </li>
        ))}
      </ul>
    );

  return (
    <Tooltip content={content} open={tooltipOpen}>
      {badge}
    </Tooltip>
  );
}
