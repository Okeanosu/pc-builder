'use client';

import { useEffect, useState } from 'react';

/**
 * Height of the site's sticky header, if the surrounding layout renders one, so a full-height
 * workspace can fill exactly the rest of the viewport. 0 when there is no header.
 */
export function useHeaderOffset(): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const header = Array.from(document.querySelectorAll('header')).find((h) => {
      if (h.closest('[data-workshop-shell]')) return false;
      const { position } = getComputedStyle(h);
      return position === 'sticky' || position === 'fixed';
    });
    if (!header) return;
    const update = () => setOffset(Math.round(header.getBoundingClientRect().height));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return offset;
}
