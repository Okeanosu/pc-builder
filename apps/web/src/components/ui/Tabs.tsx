'use client';

import { Tabs as TabsPrimitive } from 'radix-ui';
import { type ComponentPropsWithRef, createContext, useContext } from 'react';
import { cn } from '@/lib/cn';

type TabsVariant = 'segmented' | 'line';
const VariantContext = createContext<TabsVariant>('segmented');

interface TabsProps extends ComponentPropsWithRef<typeof TabsPrimitive.Root> {
  /** `segmented` for switching views in place; `line` for page sections (e.g. product detail). */
  variant?: TabsVariant;
}

export function Tabs({ variant = 'segmented', className, ...props }: TabsProps) {
  return (
    <VariantContext.Provider value={variant}>
      <TabsPrimitive.Root className={cn('flex flex-col gap-4', className)} {...props} />
    </VariantContext.Provider>
  );
}

export function TabsList({ className, ...props }: ComponentPropsWithRef<typeof TabsPrimitive.List>) {
  const variant = useContext(VariantContext);
  return (
    <TabsPrimitive.List
      className={cn(
        'no-scrollbar flex max-w-full overflow-x-auto',
        variant === 'segmented'
          ? 'w-fit gap-1 rounded-sm border border-border bg-surface-2 p-1'
          : 'gap-6 border-b border-border',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentPropsWithRef<typeof TabsPrimitive.Trigger>) {
  const variant = useContext(VariantContext);
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'focus-ring inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium text-muted transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4',
        variant === 'segmented'
          ? 'h-8 rounded-xs px-3 data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-raised'
          : 'relative h-10 px-0.5 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:text-fg data-[state=active]:after:bg-accent',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentPropsWithRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('focus-ring rounded-sm', className)} {...props} />;
}
