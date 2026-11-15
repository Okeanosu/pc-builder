import { CATEGORY_LABELS, type CategoryKey } from '@pc/shared';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { viaImageOptimizer } from '@/lib/images';
import { CategoryIllustration } from './CategoryIllustration';

interface ProductImageProps {
  /** Product photo URL (seed photos are 4:3 on white). Without one the category drawing is shown. */
  src?: string | null;
  alt: string;
  category: CategoryKey;
  /** Sizes hint for next/image; match the rendered width. */
  sizes?: string;
  priority?: boolean;
  /** Set an aspect ratio or fixed size here; defaults to 4:3. */
  className?: string;
}

export function ProductImage({
  src,
  alt,
  category,
  sizes = '(min-width: 1024px) 280px, 50vw',
  priority,
  className,
}: ProductImageProps) {
  return (
    <div
      className={cn(
        '@container relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-surface-2 transition-colors duration-150',
        className,
        // Photos sit on a light tile in both themes so their white backdrop can multiply into it.
        src && 'bg-photo group-hover:bg-photo-hover',
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={!viaImageOptimizer(src)}
          className="object-contain p-[3%] mix-blend-multiply"
        />
      ) : (
        <div role="img" aria-label={alt || CATEGORY_LABELS[category]} className="absolute inset-0">
          <CategoryIllustration category={category} className="absolute inset-[14%] size-[72%] text-fg/60" />
        </div>
      )}
    </div>
  );
}
