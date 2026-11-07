'use client';

import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { doneLabel, type ToolChip } from '@/stores/chat';

const runningLabel = (label: string) => (/(…|\.\.\.)\s*$/u.test(label) ? label : `${label}…`);

const MIN_RUNNING_MS = 700;

export function ToolStatusChip({ chip, className }: { chip: ToolChip; className?: string }) {
  // A chip that appeared live keeps its spinner briefly, so instant tool calls are still visible.
  const [bornRunning] = useState(chip.status === 'running');
  const [held, setHeld] = useState(bornRunning);
  useEffect(() => {
    if (!bornRunning) return;
    const t = setTimeout(() => setHeld(false), MIN_RUNNING_MS);
    return () => clearTimeout(t);
  }, [bornRunning]);
  const running = chip.status === 'running' || held;
  return (
    <span
      className={cn(
        'inline-flex h-7 max-w-full animate-pop-in items-center gap-1.5 rounded-full border px-3 text-xs',
        running ? 'border-accent/40 bg-accent/10 text-accent-ink' : 'border-border bg-surface text-muted',
        className,
      )}
    >
      {running ? (
        <Spinner size="sm" label={null} />
      ) : (
        <Check className="size-3.5 shrink-0 text-ok-ink" aria-hidden />
      )}
      <span className="truncate">{running ? runningLabel(chip.label) : doneLabel(chip.label)}</span>
    </span>
  );
}
