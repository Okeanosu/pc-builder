'use client';

import { useEffect, useRef, useState } from 'react';

const MIN_CHARS_PER_MS = 0.09;
const CATCH_UP_MS = 900;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Reveals streamed text at a steady pace instead of in network-sized bursts: the backlog drains
 * proportionally (about 1s to catch up) with a floor speed. Text that was complete on mount, or
 * reduced motion, is shown at once.
 */
export function useSmoothText(text: string, streaming: boolean): { shown: string; revealing: boolean } {
  const [animate] = useState(() => streaming && !prefersReducedMotion());
  const [length, setLength] = useState(animate ? 0 : text.length);
  const pos = useRef(length);
  const target = useRef(text.length);
  target.current = text.length;

  useEffect(() => {
    if (!animate || pos.current >= text.length) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const backlog = target.current - pos.current;
      pos.current = Math.min(
        target.current,
        pos.current + Math.max(MIN_CHARS_PER_MS * dt, (backlog * dt) / CATCH_UP_MS),
      );
      setLength(Math.floor(pos.current));
      if (pos.current < target.current) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, text]);

  if (!animate) return { shown: text, revealing: false };
  return { shown: text.slice(0, length), revealing: length < text.length || streaming };
}
