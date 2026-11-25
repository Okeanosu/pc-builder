import type { OrderDTO } from '@pc/shared';
import { cn } from '@/lib/cn';
import { timelineSteps } from './timeline';

const timeFmt = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Asia/Ho_Chi_Minh',
});

/** Vertical lifecycle: 8 px dots, done steps filled, the current one ringed in ink, a cancelled end in red. */
export function OrderTimeline({
  order,
  className,
}: {
  order: Pick<OrderDTO, 'status' | 'type' | 'createdAt' | 'paidAt'>;
  className?: string;
}) {
  const steps = timelineSteps(order);
  return (
    <ol className={cn('flex flex-col', className)} aria-label="Tiến trình đơn hàng">
      {steps.map((step, i) => (
        <li
          key={step.key}
          className="relative flex gap-3 pb-5 last:pb-0"
          aria-current={step.state === 'current' ? 'step' : undefined}
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'absolute start-[3px] top-4 bottom-0 w-0.5',
                step.state === 'done' ? 'bg-fg/40' : 'bg-border',
              )}
            />
          )}
          <span
            aria-hidden
            className={cn(
              'relative mt-1.5 size-2 shrink-0 rounded-full',
              step.state === 'done' && 'bg-fg',
              step.state === 'current' && 'bg-fg outline-2 outline-offset-2 outline-fg outline-solid',
              step.state === 'upcoming' && 'border border-border-strong bg-surface',
              step.state === 'cancelled' && 'bg-danger',
            )}
          />
          <div className="flex min-w-0 flex-col">
            <span
              className={cn(
                'text-sm',
                step.state === 'upcoming' ? 'text-muted' : 'text-fg',
                step.state === 'current' && 'font-semibold',
                step.state === 'cancelled' && 'text-danger-ink',
              )}
            >
              {step.label}
              {step.state === 'current' && <span className="sr-only"> (bước hiện tại)</span>}
            </span>
            {step.at && (
              <time dateTime={step.at} className="tabular-nums text-xs text-muted">
                {timeFmt.format(new Date(step.at))}
              </time>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
