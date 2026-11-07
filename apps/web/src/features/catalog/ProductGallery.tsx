'use client';

import type { CategoryKey } from '@pc/shared';
import { useState } from 'react';
import { ProductImage } from '@/components/domain/ProductImage';
import { cn } from '@/lib/cn';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  category: CategoryKey;
}

/** Main image plus thumbnails; with no photos it shows the category drawing. */
export function ProductGallery({ images, alt, category }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <ProductImage
        src={images[active] ?? null}
        alt={alt}
        category={category}
        priority
        sizes="(min-width: 1024px) 560px, 100vw"
        className="rounded-md border border-border"
      />
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label="Ảnh sản phẩm">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ảnh ${i + 1}`}
                aria-current={i === active || undefined}
                className={cn(
                  'focus-ring block w-20 overflow-hidden rounded-sm border-2',
                  i === active ? 'border-accent' : 'border-transparent hover:border-border-strong',
                )}
              >
                <ProductImage src={src} alt="" category={category} designator={false} sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
