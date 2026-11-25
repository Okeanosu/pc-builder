import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';

export const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-2 text-muted',
        accent: 'bg-fg text-bg',
        ok: 'bg-ok/12 text-ok-ink',
        warn: 'bg-warn/14 text-warn-ink',
        danger: 'bg-danger/10 text-danger-ink',
        /** High-emphasis label, e.g. a build's name tag. */
        solid: 'bg-fg text-bg',
        outline: 'border border-border-strong bg-transparent text-fg',
      },
      size: {
        sm: 'h-5 px-2 text-xs [&_svg]:size-3',
        md: 'h-6 px-2.5 text-xs [&_svg]:size-3.5',
      },
      /** Tabular figures for codes and numbers (rule codes, sockets, "-12%"). */
      mono: { true: 'tabular-nums', false: '' },
    },
    defaultVariants: { tone: 'neutral', size: 'md', mono: false },
  },
);

export interface BadgeProps extends ComponentPropsWithRef<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, mono, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size, mono }), className)} {...props} />;
}
