'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export type ListPatch = Record<string, string | number | null | undefined>;

/** Applies a patch to a query string; any filter change resets the page unless the patch sets it. */
export function patchSearch(current: string, patch: ListPatch): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
  }
  if (!('page' in patch)) next.delete('page');
  if (next.get('page') === '1') next.delete('page');
  const s = next.toString();
  return s ? `?${s}` : '';
}

/** List filters live in the URL so a filtered view can be shared or reloaded. Needs a Suspense parent. */
export function useListParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = useCallback(
    (patch: ListPatch) => {
      router.replace(`${pathname}${patchSearch(params.toString(), patch)}`, { scroll: false });
    },
    [params, pathname, router],
  );
  const get = useCallback((key: string) => params.get(key) ?? '', [params]);
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  return { get, set, page };
}

export function pickEnum<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
