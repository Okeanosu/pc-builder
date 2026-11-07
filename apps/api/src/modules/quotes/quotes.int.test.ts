import { formatVnd } from '@pc/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createCommerceHarness } from '../../../test/test-support';
import { builds } from '../../db/schema';
import { embeddedFontNames, extractPdfText } from './test-pdf-text';

const NOW = new Date('2026-11-07T03:00:00Z');
const h = createCommerceHarness({ now: () => NOW });
afterAll(() => h.close());
beforeEach(() => h.seed());

const binary = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('GET /api/quotes/builds/:id.pdf', () => {
  it('renders a Vietnamese build quote with DejaVu fonts, assembly fee and grand total', async () => {
    const cpu = await h.product('cpu', { price: 4_590_000, salePrice: 4_290_000 });
    const gpu = await h.product('gpu', { price: 9_990_000, salePrice: null });
    const buildId = await h.insertBuild([
      { category: 'cpu', id: cpu.id, name: cpu.name, price: 4_590_000 },
      { category: 'gpu', id: gpu.id, name: gpu.name, price: gpu.price },
    ]);
    await h.deps.db
      .update(builds)
      .set({ estimatedWattage: 412, recommendedPsuWattage: 650 })
      .where(eq(builds.id, buildId));

    const res = await request(h.app).get(`/api/quotes/builds/${buildId}.pdf`).buffer(true).parse(binary);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe(`inline; filename="bao-gia-${buildId}.pdf"`);
    const pdf = res.body as Buffer;
    expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
    expect(embeddedFontNames(pdf)).toEqual(expect.arrayContaining(['DejaVuSans', 'DejaVuSans-Bold']));

    const text = extractPdfText(pdf);
    const flat = text.replace(/\s+/g, ' ');
    expect(text).toContain('PC BUILDER — BÁO GIÁ CẤU HÌNH');
    expect(text).toContain('07/11/2026');
    for (const header of ['Linh kiện', 'Sản phẩm', 'SL', 'Đơn giá', 'Thành tiền'])
      expect(text).toContain(header);
    expect(text).toContain('CPU');
    expect(text).toContain('Card đồ họa');
    expect(flat).toContain(cpu.name);
    expect(flat).toContain(gpu.name);
    expect(text).toContain(formatVnd(4_290_000));
    expect(text).toContain('Phí lắp ráp');
    expect(flat).toContain('Công suất ước tính: 412 W');
    expect(flat).toContain('Nguồn đề xuất: 650 W');
    expect(text).toContain(formatVnd(h.deps.env.ASSEMBLY_FEE));
    expect(text).toContain(formatVnd(4_290_000 + 9_990_000 + h.deps.env.ASSEMBLY_FEE));
    expect(text).toContain('Giá tham khảo, có hiệu lực 7 ngày');
  });

  it('404s for unknown or malformed build ids', async () => {
    const missing = await request(h.app).get('/api/quotes/builds/00000000-0000-4000-8000-000000000000.pdf');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect((await request(h.app).get('/api/quotes/builds/abc.pdf')).status).toBe(404);
  });
});

describe('GET /api/quotes/cart.pdf', () => {
  it('quotes the caller’s cart without an assembly fee', async () => {
    const ram = await h.product('ram', { price: 1_200_000, salePrice: null, stock: 10, reserved: 0 });
    const agent = request.agent(h.app);
    await agent.post('/api/cart/items').send({ productId: ram.id, qty: 2 });

    const res = await agent.get('/api/quotes/cart.pdf').buffer(true).parse(binary);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe('inline; filename="bao-gia-gio-hang.pdf"');
    const text = extractPdfText(res.body as Buffer);
    const flat = text.replace(/\s+/g, ' ');
    expect(text).toContain('PC BUILDER — BÁO GIÁ CẤU HÌNH');
    expect(flat).toContain(ram.name);
    expect(text).toContain(formatVnd(2_400_000));
    expect(text).not.toContain('Phí lắp ráp');
    expect(text).toContain('Giá tham khảo, có hiệu lực 7 ngày');
  });

  it('refuses to quote an empty cart', async () => {
    const res = await request(h.app).get('/api/quotes/cart.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMPTY_CART');
  });
});
