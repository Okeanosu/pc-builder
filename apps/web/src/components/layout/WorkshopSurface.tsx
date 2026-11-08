import type { ComponentPropsWithoutRef } from 'react';
import { ThemeScope } from '@/components/ui/ThemeScope';
import { cn } from '@/lib/cn';

interface WorkshopSurfaceProps extends ComponentPropsWithoutRef<'div'> {
  /** Draw the dot-grid mat behind the content (default). Turn off for nested panels. */
  mat?: boolean;
}

/**
 * Surface for the AI Advisor and PC Customizer. It follows the site theme; it still scopes overlays
 * (part picker drawer, tooltips) so they portal inside it. `mat` paints the page background.
 */
export function WorkshopSurface({ mat = true, className, ...props }: WorkshopSurfaceProps) {
  return <ThemeScope className={cn(mat && 'bg-bg', 'text-fg', className)} {...props} />;
}
