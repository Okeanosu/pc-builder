import { describe, expect, it } from 'vitest';
import { clampPage, patchSearch } from './use-list-params';

describe('patchSearch', () => {
  it('resets the page on a filter change and drops empty values', () => {
    expect(patchSearch('status=PAID&page=3', { q: 'PCB' })).toBe('?status=PAID&q=PCB');
    expect(patchSearch('status=PAID', { status: null })).toBe('');
    expect(patchSearch('q=a', { page: 1 })).toBe('?q=a');
    expect(patchSearch('q=a', { page: 4 })).toBe('?q=a&page=4');
  });
});

describe('clampPage', () => {
  it('points a page past the end back to the last page', () => {
    expect(clampPage(9, 45, 20)).toBe(3);
    expect(clampPage(4, 60, 20)).toBe(3);
  });

  it('sends an out-of-range page to page 1 when the list is empty', () => {
    expect(clampPage(5, 0, 20)).toBe(1);
  });

  it('leaves valid pages alone', () => {
    expect(clampPage(3, 45, 20)).toBeNull();
    expect(clampPage(1, 0, 20)).toBeNull();
  });
});
