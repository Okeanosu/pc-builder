'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';
import { describedByProps, OverlayHeading, type OverlayHeadingProps, overlayClass } from './Dialog';
import { usePortalContainer } from './ThemeScope';

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

const SIDES = {
  right:
    'inset-y-0 end-0 h-full w-[min(480px,100vw)] border-s data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right',
  left: 'inset-y-0 start-0 h-full w-[min(320px,88vw)] border-e data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left',
  bottom:
    'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-lg border-t data-[state=closed]:animate-sheet-out-bottom data-[state=open]:animate-sheet-in-bottom',
  /** Bottom sheet on phones, side panel from 640px — the default for pickers. */
  responsive:
    'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-lg border-t max-sm:data-[state=closed]:animate-sheet-out-bottom max-sm:data-[state=open]:animate-sheet-in-bottom sm:inset-x-auto sm:inset-y-0 sm:end-0 sm:h-full sm:max-h-none sm:w-[min(480px,100vw)] sm:rounded-none sm:border-t-0 sm:border-s sm:data-[state=closed]:animate-sheet-out-right sm:data-[state=open]:animate-sheet-in-right',
} as const;

interface DrawerContentProps
  extends Omit<ComponentPropsWithRef<typeof DialogPrimitive.Content>, 'title'>,
    OverlayHeadingProps {
  side?: keyof typeof SIDES;
}

/** Compose with <DrawerBody> and <DrawerFooter>; the header comes from `title` / `description`. */
export function DrawerContent({
  title,
  description,
  hideTitle,
  className,
  children,
  side = 'responsive',
  ...props
}: DrawerContentProps) {
  const container = usePortalContainer();
  const showHandle = side === 'bottom' || side === 'responsive';
  return (
    <DialogPrimitive.Portal container={container}>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col border-border bg-surface text-fg shadow-overlay outline-none',
          SIDES[side],
          className,
        )}
        {...describedByProps(description)}
        {...props}
      >
        {showHandle && (
          <div
            className={cn(
              'mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-strong/60',
              side === 'responsive' && 'sm:hidden',
            )}
            aria-hidden
          />
        )}
        <OverlayHeading
          title={title}
          description={description}
          hideTitle={hideTitle}
          className="flex shrink-0 flex-col gap-1 border-b border-border px-5 py-4 pe-12"
        />
        {children}
        <DialogPrimitive.Close
          aria-label="Đóng"
          className="focus-ring absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Scrolling region. Prefer `grid content-start` over flex for lists: flex children shrink inside a scroller. */
export function DrawerBody({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: ComponentPropsWithRef<'div'>) {
  return (
    <div
      className={cn('flex shrink-0 items-center gap-2 border-t border-border px-5 py-4', className)}
      {...props}
    />
  );
}
