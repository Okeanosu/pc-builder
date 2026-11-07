import { CATEGORY_LABELS, type CategoryKey } from '@pc/shared';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { CategoryIllustration } from './CategoryIllustration';
import { CATEGORY_COLOR, CATEGORY_DESIGNATOR } from './category';

interface ProductImageProps {
  /** Product photo URL. Seed data has none, so the category drawing is the normal case. */
  src?: string | null;
  alt: string;
  category: CategoryKey;
  /** Sizes hint for next/image; match the rendered width. */
  sizes?: string;
  priority?: boolean;
  /** Show the silkscreen designator (e.g. PCIE_X16) on the drawing plate. */
  designator?: boolean;
  /** Set an aspect ratio or fixed size here; defaults to 4:3. */
  className?: string;
}

export function ProductImage({
  src,
  alt,
  category,
  sizes = '(min-width: 1024px) 280px, 50vw',
  priority,
  designator = true,
  className,
}: ProductImageProps) {
  return (
    <div
      className={cn(
        '@container relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-surface-2',
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-contain p-[8%]" />
      ) : (
        <div
          role="img"
          aria-label={alt || CATEGORY_LABELS[category]}
          className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--mat-ink)_1px,transparent_1.5px)] bg-size-[16px_16px]"
        >
          <CategoryIllustration category={category} className="absolute inset-[10%] size-[80%] text-fg/70" />
          {designator && (
            <span className="absolute bottom-2 start-2.5 flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wide text-muted @max-[11rem]:hidden">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[category] }} />
              {CATEGORY_DESIGNATOR[category]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
