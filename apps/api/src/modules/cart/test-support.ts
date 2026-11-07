import type { CategoryKey, OrderDTO, Role } from '@pc/shared';
import { eq } from 'drizzle-orm';
import type { Express } from 'express';
import request from 'supertest';
import { createTestDeps } from '../../../test/helpers';
import { createApp } from '../../app';
import { builds, categories, products, users } from '../../db/schema';
import { seedDatabase } from '../../db/seed';
import type { AppDeps } from '../../deps';
import { signAccessToken } from '../../middleware/auth';

export const CHECKOUT = {
  shippingName: 'Nguyễn Văn Khách',
  phone: '0900000003',
  address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
};

/** Integration-test harness for the commerce modules: seeded DB, app factory and token minting. */
export function createCommerceHarness(overrides: Partial<AppDeps> = {}) {
  const t = createTestDeps(overrides);
  let app: Express = createApp(t.deps);

  return {
    t,
    get app() {
      return app;
    },
    get deps() {
      return t.deps;
    },
    async seed() {
      await t.reset();
      await seedDatabase(t.deps.db);
      app = createApp(t.deps);
    },
    appWith(extra: Partial<AppDeps>) {
      return createApp({ ...t.deps, ...extra });
    },
    /** Places a guest order through the public API, optionally paying it via the simulator. */
    async placeOrder(lines: { productId: string; qty: number }[], opts: { pay?: boolean } = {}) {
      const agent = request.agent(app);
      for (const line of lines) {
        const added = await agent.post('/api/cart/items').send(line);
        if (added.status !== 201) throw new Error(`add to cart failed: ${JSON.stringify(added.body)}`);
      }
      const res = await agent.post('/api/orders').send(CHECKOUT);
      if (res.status !== 201) throw new Error(`order failed: ${JSON.stringify(res.body)}`);
      if (opts.pay) {
        const paid = await agent.post(`/api/payments/${res.body.code}/simulate`);
        if (paid.status !== 200) throw new Error(`payment failed: ${JSON.stringify(paid.body)}`);
      }
      return res.body as OrderDTO;
    },
    async tokenFor(role: Role): Promise<string> {
      const [u] = await t.deps.db.select().from(users).where(eq(users.role, role)).limit(1);
      if (!u) throw new Error(`no seeded ${role}`);
      return signAccessToken({ id: u.id, email: u.email, role: u.role }, t.deps.env.JWT_ACCESS_SECRET);
    },
    async userId(role: Role): Promise<string> {
      const [u] = await t.deps.db.select({ id: users.id }).from(users).where(eq(users.role, role)).limit(1);
      if (!u) throw new Error(`no seeded ${role}`);
      return u.id;
    },
    /** First active product of a category with enough stock, optionally forcing stock/reserved/price. */
    async product(
      categoryKey: CategoryKey,
      patch: Partial<Pick<typeof products.$inferInsert, 'stock' | 'reserved' | 'price' | 'salePrice'>> = {},
      offset = 0,
    ) {
      const [row] = await t.deps.db
        .select({ p: products })
        .from(products)
        .innerJoin(categories, eq(categories.id, products.categoryId))
        .where(eq(categories.key, categoryKey))
        .orderBy(products.sku)
        .limit(1)
        .offset(offset);
      if (!row) throw new Error(`no product in ${categoryKey}`);
      if (Object.keys(patch).length === 0) return row.p;
      const [updated] = await t.deps.db
        .update(products)
        .set(patch)
        .where(eq(products.id, row.p.id))
        .returning();
      return updated!;
    },
    async getProduct(id: string) {
      const [p] = await t.deps.db.select().from(products).where(eq(products.id, id));
      return p!;
    },
    /** Stores a build made of one product per given category and returns its id. */
    async insertBuild(productIds: { category: CategoryKey; id: string; name: string; price: number }[]) {
      const [b] = await t.deps.db
        .insert(builds)
        .values({
          name: 'Cấu hình thử nghiệm',
          purpose: 'gaming',
          budget: 30_000_000,
          items: productIds.map((p) => ({
            category: p.category,
            productId: p.id,
            name: p.name,
            price: p.price,
          })),
          totalPrice: productIds.reduce((s, p) => s + p.price, 0),
          source: 'CUSTOM',
        })
        .returning({ id: builds.id });
      return b!.id;
    },
    close: () => t.close(),
  };
}

export function guestIdFrom(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const c of cookies) {
    const m = /^gid=([^;]+)/.exec(c);
    if (m) return m[1]!;
  }
  throw new Error('no gid cookie');
}
