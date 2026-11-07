import type { BuildDTO, ChatEvent, Paginated, ProductSummaryDTO } from '@pc/shared';
import { type APIRequestContext, expect, type Page } from '@playwright/test';
import { API_URL } from './env';

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 1×1 transparent PNG: the VietQR image host is external, so the pay page gets a local stand-in.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export async function stubVietQrImages(page: Page): Promise<void> {
  await page.route('https://img.vietqr.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  );
}

/** Cheapest in-stock product of a category matching `specs` (ids in `exclude` skipped), from the catalog API. */
export async function findProduct(
  api: APIRequestContext,
  category: string,
  specs: Record<string, string>,
  exclude: string[] = [],
): Promise<ProductSummaryDTO> {
  const params = new URLSearchParams({ category, inStock: 'true', sort: 'price_asc', pageSize: '20' });
  for (const [k, v] of Object.entries(specs)) params.set(`specs[${k}]`, v);
  const res = await api.get(`${API_URL}/products?${params}`);
  expect(res.status()).toBe(200);
  const page = (await res.json()) as Paginated<ProductSummaryDTO>;
  const product = page.items.find((p) => !exclude.includes(p.id));
  if (!product) throw new Error(`no in-stock ${category} with ${JSON.stringify(specs)}`);
  return product;
}

/** Parses a finished `text/event-stream` body of the chat endpoint into its events. */
export function parseSse(body: string): ChatEvent[] {
  return body
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith('data:'))
    .map((chunk) => JSON.parse(chunk.slice('data:'.length).trim()) as ChatEvent);
}

export function buildsFrom(events: ChatEvent[]): BuildDTO[] {
  const ev = events.find((e): e is Extract<ChatEvent, { type: 'builds' }> => e.type === 'builds');
  return ev?.builds ?? [];
}

/** The newest toast with this exact title (the aria-live mirror and older toasts are skipped). */
export function toastTitle(page: Page, title: string) {
  return page.getByText(title, { exact: true }).last();
}
