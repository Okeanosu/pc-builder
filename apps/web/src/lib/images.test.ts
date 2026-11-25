import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';
import { OPTIMIZED_IMAGE_HOSTS, viaImageOptimizer } from './images';

describe('viaImageOptimizer', () => {
  it('optimizes local files and allow-listed hosts', () => {
    expect(viaImageOptimizer('/products/cpu.webp')).toBe(true);
    expect(viaImageOptimizer('https://img.vietqr.io/image/970422-0000-compact2.png')).toBe(true);
  });

  it('sends any other remote URL straight to the browser instead of through the server', () => {
    expect(viaImageOptimizer('https://example.com/cpu.png')).toBe(false);
    expect(viaImageOptimizer('http://img.vietqr.io/x.png')).toBe(false);
    expect(viaImageOptimizer('//evil.example/x.png')).toBe(false);
    expect(viaImageOptimizer('not a url')).toBe(false);
  });
});

describe('next.config images', () => {
  it('allows only the listed hosts, never a wildcard', () => {
    const patterns = nextConfig.images?.remotePatterns ?? [];
    expect(patterns).toEqual(OPTIMIZED_IMAGE_HOSTS.map((hostname) => ({ protocol: 'https', hostname })));
    expect(JSON.stringify(patterns)).not.toContain('*');
  });
});
