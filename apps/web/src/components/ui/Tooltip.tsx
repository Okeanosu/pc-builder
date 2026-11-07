'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { usePortalContainer } from './ThemeScope';

interface TooltipProps {
  content: ReactNode;
  /** A single focusable element (button, link). Tooltips must never be the only way to reach information. */
  children: ReactNode;
  side?: ComponentPropsWithRef<typeof TooltipPrimitive.Content>['side'];
  align?: ComponentPropsWithRef<typeof TooltipPrimitive.Content>['align'];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  open,
  defaultOpen,
  onOpenChange,
  delayDuration = 200,
  className,
}: TooltipProps) {
  const container = usePortalContainer();
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal container={container}>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              'z-50 max-w-72 rounded-sm bg-fg px-3 py-2 text-xs text-bg shadow-overlay data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in',
              className,
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-fg" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
