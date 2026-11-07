/** Remote hosts next/image may fetch through the server; a wildcard would turn /_next/image into an open proxy. */
export const OPTIMIZED_IMAGE_HOSTS = ['img.vietqr.io'] as const;

/** Local paths and allow-listed https hosts go through the optimizer; anything else is loaded by the browser. */
export function viaImageOptimizer(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && (OPTIMIZED_IMAGE_HOSTS as readonly string[]).includes(url.hostname);
  } catch {
    return false;
  }
}
