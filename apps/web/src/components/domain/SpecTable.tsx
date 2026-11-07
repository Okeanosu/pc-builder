import type { SpecField } from '@pc/shared';
import { OctagonX, TriangleExclamationPoint } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatSpecValue } from '@/lib/format';

interface SpecTableProps {
  /** Category spec schema (CategoryDTO.specSchema); order is preserved. */
  fields: readonly SpecField[];
  /** Product specs object (ProductDTO.specs). */
  specs: object;
  /** Mark rows involved in a compatibility issue, e.g. { socket: 'error' }. */
  highlight?: Partial<Record<string, 'warning' | 'error'>>;
  /** Show rows without a value as "—" instead of hiding them. */
  showEmpty?: boolean;
  dense?: boolean;
  caption?: string;
  className?: string;
}

export function SpecTable({
  fields,
  specs,
  highlight,
  showEmpty,
  dense,
  caption,
  className,
}: SpecTableProps) {
  const values = specs as Record<string, unknown>;
  const rows = fields
    .map((f) => ({ field: f, text: formatSpecValue(values[f.key], f) }))
    .filter((r) => showEmpty || r.text !== null);

  return (
    <div className={cn('overflow-hidden rounded-md border border-border bg-surface', className)}>
      {caption && (
        <div className="border-b border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-fg">
          {caption}
        </div>
      )}
      <dl className="divide-y divide-border">
        {rows.map(({ field, text }) => {
          const mark = highlight?.[field.key];
          return (
            <div
              key={field.key}
              className={cn(
                'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-4 px-4',
                dense ? 'py-2' : 'py-2.5',
                mark === 'warning' && 'bg-warn/10',
                mark === 'error' && 'bg-danger/10',
              )}
            >
              <dt className="flex items-center gap-1.5 text-sm text-muted">
                {mark === 'error' && <OctagonX className="size-3.5 shrink-0 text-danger-ink" aria-hidden />}
                {mark === 'warning' && (
                  <TriangleExclamationPoint className="size-3.5 shrink-0 text-warn-ink" aria-hidden />
                )}
                {field.label}
                {mark && (
                  <span className="sr-only">{mark === 'error' ? '(gây xung đột)' : '(cần lưu ý)'}</span>
                )}
              </dt>
              <dd
                className={cn(
                  'min-w-0 break-words font-mono text-sm text-fg',
                  mark === 'error' && 'font-semibold text-danger-ink',
                  mark === 'warning' && 'font-semibold text-warn-ink',
                )}
              >
                {text ?? <span className="text-muted">—</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
