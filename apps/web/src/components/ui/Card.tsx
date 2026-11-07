import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';

export const cardVariants = cva('rounded-md border text-fg', {
  variants: {
    variant: {
      default: 'border-border bg-surface',
      /** Sits inside another surface (spec groups, summaries). */
      inset: 'border-border bg-surface-2',
      /** Whole card is clickable: lifts on hover, shows the focus ring when a child link is focused. */
      interactive:
        'border-border bg-surface transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring',
      /** Highlighted choice, e.g. the selected build. */
      selected: 'border-accent bg-surface shadow-[0_0_0_1px_var(--color-accent)]',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface CardProps extends ComponentPropsWithRef<'div'>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-0', className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentPropsWithRef<'h3'>) {
  return <h3 className={cn('text-base font-semibold text-fg', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentPropsWithRef<'p'>) {
  return <p className={cn('text-sm text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div className={cn('flex items-center gap-3 border-t border-border px-5 py-4', className)} {...props} />
  );
}
