import type { OrderDTO } from '@pc/shared';
import { cn } from '@/lib/cn';
import { formatDateTime } from '../format';
import { type StepState, timelineSteps } from './order-state';

const DOT: Record<StepState, string> = {
  done: 'bg-fg',
  current: 'bg-fg outline-2 outline-offset-2 outline-fg outline-solid',
  upcoming: 'border border-border-strong bg-surface',
  cancelled: 'bg-danger',
};

const STATE_TEXT: Record<StepState, string> = {
  done: 'đã xong',
  current: 'đang ở bước này',
  upcoming: 'chưa tới',
  cancelled: 'đã hủy',
};

/** Order progress as 8px dots on a rail; the current step is ringed in ink. */
export function OrderTimeline({
  order,
}: {
  order: Pick<OrderDTO, 'status' | 'type' | 'createdAt' | 'paidAt'>;
}) {
  const steps = timelineSteps(order);
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => (
        <li key={s.status} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (
            <span
              className={cn(
                'absolute start-[3px] top-4 bottom-0 w-0.5',
                s.state === 'done' ? 'bg-fg/40' : 'bg-border',
              )}
              aria-hidden
            />
          )}
          <span className={cn('relative mt-1.5 size-2 shrink-0 rounded-full', DOT[s.state])} aria-hidden />
          <div className="flex min-w-0 flex-col">
            <span
              className={cn(
                'text-sm',
                s.state === 'upcoming' ? 'text-muted' : 'text-fg',
                s.state === 'current' && 'font-semibold',
                s.state === 'cancelled' && 'text-danger-ink',
              )}
            >
              {s.label}
              <span className="sr-only"> ({STATE_TEXT[s.state]})</span>
            </span>
            {s.at && <span className="text-xs text-muted tabular-nums">{formatDateTime(s.at)}</span>}
            {s.state === 'current' && !s.at && <span className="text-xs text-muted">Bước hiện tại</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}
