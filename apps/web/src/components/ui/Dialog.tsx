'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';
import { usePortalContainer } from './ThemeScope';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const overlayClass =
  'fixed inset-0 z-50 bg-scrim backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in';

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

interface DialogContentProps extends ComponentPropsWithRef<typeof DialogPrimitive.Content> {
  size?: keyof typeof SIZES;
  /** Hide the corner close button when the footer already offers a clear way out. */
  hideClose?: boolean;
}

export function DialogContent({ className, children, size = 'md', hideClose, ...props }: DialogContentProps) {
  const container = usePortalContainer();
  return (
    <DialogPrimitive.Portal container={container}>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-y-auto rounded-lg border border-border bg-surface text-fg shadow-overlay outline-none data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in',
          SIZES[size],
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label="Đóng"
            className="focus-ring absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 px-6 pt-6 pe-12', className)} {...props} />;
}

export function DialogBody({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return <div className={cn('px-6 py-5 text-sm', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: ComponentPropsWithRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold text-fg', className)} {...props} />;
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted', className)} {...props} />;
}
