'use client';

import { type ComponentPropsWithoutRef, createContext, useContext, useState } from 'react';
import { cn } from '@/lib/cn';

const PortalContainerContext = createContext<HTMLElement | null>(null);

/** Overlays (Dialog, Drawer, Select, Tooltip) portal here so they inherit the theme of the surface that opened them. */
export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined;
}

interface ThemeScopeProps extends ComponentPropsWithoutRef<'div'> {
  /** Pin a light/dark scope regardless of the page theme. */
  theme?: 'light' | 'dark';
  /** Graphite "workshop" treatment used by Advisor/Builder surfaces. */
  workshop?: boolean;
}

export function ThemeScope({ theme, workshop, className, children, ...props }: ThemeScopeProps) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  return (
    <div ref={setEl} data-theme={theme} className={cn(workshop && 'workshop', className)} {...props}>
      <PortalContainerContext.Provider value={el}>{children}</PortalContainerContext.Provider>
    </div>
  );
}
