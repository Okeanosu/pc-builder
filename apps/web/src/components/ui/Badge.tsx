import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';

export const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xs border font-semibold [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-surface-2 text-muted',
        accent: 'border-accent/35 bg-accent/12 text-accent-ink',
        ok: 'border-ok/45 bg-ok/16 text-ok-ink',
        warn: 'border-warn/45 bg-warn/14 text-warn-ink',
        danger: 'border-danger/40 bg-danger/12 text-danger-ink',
        /** High-emphasis label, e.g. a build's name tag. */
        solid: 'border-transparent bg-fg text-bg',
        outline: 'border-border-strong bg-transparent text-fg',
      },
      size: {
        sm: 'h-5 px-1.5 text-xs [&_svg]:size-3',
        md: 'h-6 px-2 text-xs [&_svg]:size-3.5',
      },
      /** Monospace for codes and numbers (rule codes, sockets, "-12%"). */
      mono: { true: 'font-mono tracking-normal tabular-nums', false: '' },
    },
    defaultVariants: { tone: 'neutral', size: 'md', mono: false },
  },
);

export interface BadgeProps extends ComponentPropsWithRef<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, mono, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size, mono }), className)} {...props} />;
}
