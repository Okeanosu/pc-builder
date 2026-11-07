import type { ReactNode } from 'react';
import { ThemeScope } from '@/components/ui/ThemeScope';
import { cn } from '@/lib/cn';

export type PaneTheme = 'light' | 'dark';

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-5">
      <header className="flex max-w-2xl flex-col gap-1.5">
        <h2 id={`${id}-title`} className="text-xl font-bold text-fg">
          {title}
        </h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}

/** Renders the same specimen in a light and a dark scope; overlays opened inside follow their pane. */
export function ThemePanes({
  children,
  stack,
  flush,
}: {
  children: (theme: PaneTheme) => ReactNode;
  /** One pane per row (wide components such as headers). */
  stack?: boolean;
  /** No inner padding (full-bleed previews). */
  flush?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid overflow-hidden rounded-lg border border-border',
        stack ? 'grid-cols-1' : 'xl:grid-cols-2',
      )}
    >
      {(['light', 'dark'] as const).map((t) => (
        <ThemeScope
          key={t}
          theme={t}
          className={cn(
            'flex min-w-0 flex-col gap-4 bg-bg',
            !flush && 'p-4 sm:p-6',
            t === 'dark' && (stack ? 'border-t border-border' : 'max-xl:border-t xl:border-s border-border'),
          )}
        >
          <span className={cn('text-xs font-medium text-muted', flush && 'px-4 pt-3 sm:px-6')}>
            {t === 'light' ? 'Giao diện sáng' : 'Giao diện tối'}
          </span>
          {children(t)}
        </ThemeScope>
      ))}
    </div>
  );
}

export function Specimen({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-xs font-medium text-muted">{label}</h3>
      <div className={cn('flex flex-wrap items-center gap-3', className)}>{children}</div>
    </div>
  );
}
