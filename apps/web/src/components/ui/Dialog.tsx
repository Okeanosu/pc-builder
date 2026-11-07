'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { usePortalContainer } from './ThemeScope';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const overlayClass =
  'fixed inset-0 z-50 bg-scrim backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in';

/** Props shared by Dialog and Drawer content: the accessible name is mandatory. */
export interface OverlayHeadingProps {
  /** Rendered as the overlay heading and used as its accessible name. */
  title: ReactNode;
  description?: ReactNode;
  /** Keep title/description for screen readers only (the content already shows its own heading). */
  hideTitle?: boolean;
}

/** Without a description Radix expects aria-describedby to be explicitly unset. */
export function describedByProps(description: ReactNode) {
  return description ? {} : { 'aria-describedby': undefined };
}

export function OverlayHeading({
  title,
  description,
  hideTitle,
  className,
}: OverlayHeadingProps & { className: string }) {
  if (hideTitle) {
    return (
      <>
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
        )}
      </>
    );
  }
  return (
    <div className={className}>
      <DialogPrimitive.Title className="text-lg font-semibold text-fg">{title}</DialogPrimitive.Title>
      {description && (
        <DialogPrimitive.Description className="text-sm text-muted">
          {description}
        </DialogPrimitive.Description>
      )}
    </div>
  );
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

interface DialogContentProps
  extends Omit<ComponentPropsWithRef<typeof DialogPrimitive.Content>, 'title'>,
    OverlayHeadingProps {
  size?: keyof typeof SIZES;
  /** Hide the corner close button when the footer already offers a clear way out. */
  hideClose?: boolean;
}

/** Compose with <DialogBody> and <DialogFooter>; the heading comes from `title` / `description`. */
export function DialogContent({
  title,
  description,
  hideTitle,
  className,
  children,
  size = 'md',
  hideClose,
  ...props
}: DialogContentProps) {
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
        {...describedByProps(description)}
        {...props}
      >
        <OverlayHeading
          title={title}
          description={description}
          hideTitle={hideTitle}
          className="flex flex-col gap-1.5 px-6 pt-6 pe-12"
        />
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
