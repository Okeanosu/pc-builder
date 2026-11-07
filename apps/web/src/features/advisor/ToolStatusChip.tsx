import { Check } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import { doneLabel, type ToolChip } from '@/stores/chat';

export function ToolStatusChip({ chip, className }: { chip: ToolChip; className?: string }) {
  const running = chip.status === 'running';
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
      <span className="truncate">{running ? chip.label : doneLabel(chip.label)}</span>
    </span>
  );
}
