import type { ComponentPropsWithoutRef } from 'react';
import { ThemeScope } from '@/components/ui/ThemeScope';
import { cn } from '@/lib/cn';

interface WorkshopSurfaceProps extends ComponentPropsWithoutRef<'div'> {
  /** Draw the dot-grid mat behind the content (default). Turn off for nested panels. */
  mat?: boolean;
}

/**
 * Graphite "workshop" surface for the AI Advisor and PC Customizer. Stays dark on a light site,
 * and overlays opened inside it (part picker drawer, tooltips) render dark as well.
 */
export function WorkshopSurface({ mat = true, className, ...props }: WorkshopSurfaceProps) {
  return (
    <ThemeScope workshop className={cn(mat ? 'workshop-mat' : 'bg-bg', 'text-fg', className)} {...props} />
  );
}
