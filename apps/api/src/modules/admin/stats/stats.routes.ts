import { type AdminSummaryDTO, ORDER_STATUSES, type OrderStatus, type RevenuePointDTO } from '@pc/shared';
import { count, desc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { orders, payments } from '../../../db/schema';
import type { AppDeps } from '../../../deps';
import { handler, parseQuery } from '../../../lib/http';
import { pageQuery, validationError } from '../admin.shared';
import { toAdminPaymentDTO } from '../orders/admin-orders.routes';
import { LOW_STOCK_THRESHOLD } from '../products/products.service';

const TZ = 'Asia/Ho_Chi_Minh';
/** Statuses that mean money was received (refunded cancellations are excluded). */
const REVENUE_STATUSES = sql.raw(`('PAID', 'PROCESSING', 'SHIPPING', 'COMPLETED')`);
const tz = sql.raw(`'${TZ}'`);
const MAX_RANGE_DAYS = 731;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    // Invalid dates (month 13) must not reach toISOString, which throws; rollovers (Feb 30) fail the prefix check.
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'Ngày không hợp lệ');

const revenueQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const DAY_MS = 24 * 3600 * 1000;
const shiftDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export function createAdminStatsRouter(deps: AppDeps): Router {
  const router = Router();
  const { db } = deps;

  router.get(
    '/stats/revenue',
    handler(async (req, res) => {
      const q = parseQuery(revenueQuery, req);
      const to = q.to ?? localDate.format(deps.now());
      const from = q.from ?? shiftDays(to, -29);
      if (from > to)
        throw validationError([{ path: 'from', message: 'Ngày bắt đầu phải trước ngày kết thúc' }]);
      if (Date.parse(to) - Date.parse(from) > MAX_RANGE_DAYS * DAY_MS) {
        throw validationError([{ path: 'from', message: 'Khoảng thời gian tối đa 2 năm' }]);
      }
      const unit = sql.raw(`'${q.groupBy}'`);
      const step = sql.raw(`'1 ${q.groupBy}'`);
      const fmt = sql.raw(q.groupBy === 'month' ? `'YYYY-MM'` : `'YYYY-MM-DD'`);
      const rows = await db.execute<{ period: string; revenue: string | number; orders: number }>(sql`
        WITH periods AS (
          SELECT generate_series(
            date_trunc(${unit}, ${from}::date::timestamp),
            date_trunc(${unit}, ${to}::date::timestamp),
            ${step}::interval
          ) AS p
        ), agg AS (
          SELECT date_trunc(${unit}, paid_at AT TIME ZONE ${tz}) AS p,
                 sum(total)::bigint AS revenue,
                 count(*)::int AS orders
          FROM orders
          WHERE status IN ${REVENUE_STATUSES}
            AND paid_at >= (${from}::date::timestamp AT TIME ZONE ${tz})
            AND paid_at < ((${to}::date + 1)::timestamp AT TIME ZONE ${tz})
          GROUP BY 1
        )
        SELECT to_char(periods.p, ${fmt}) AS period,
               coalesce(agg.revenue, 0) AS revenue,
               coalesce(agg.orders, 0) AS orders
        FROM periods LEFT JOIN agg ON agg.p = periods.p
        ORDER BY periods.p`);
      const points: RevenuePointDTO[] = [...rows].map((r) => ({
        period: r.period,
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      }));
      res.json(points);
    }),
  );

  router.get(
    '/stats/summary',
    handler(async (_req, res) => {
      const now = deps.now();
      const today = localDate.format(now);
      const [revenue, byStatus, low, chats] = await Promise.all([
        db.execute<{ revenue: string; orders: number }>(sql`
          SELECT coalesce(sum(total), 0)::bigint AS revenue, count(*)::int AS orders
          FROM orders
          WHERE status IN ${REVENUE_STATUSES}
            AND paid_at >= (${today}::date::timestamp AT TIME ZONE ${tz})
            AND paid_at < ((${today}::date + 1)::timestamp AT TIME ZONE ${tz})`),
        db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
        db.execute<{ n: number }>(sql`
          SELECT count(*)::int AS n FROM products
          WHERE status = 'ACTIVE' AND stock - reserved <= ${LOW_STOCK_THRESHOLD}`),
        db.execute<{ n: number }>(sql`
          SELECT count(*)::int AS n FROM chat_sessions
          WHERE created_at >= ${new Date(now.getTime() - 7 * DAY_MS).toISOString()}::timestamptz`),
      ]);
      const ordersByStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
        OrderStatus,
        number
      >;
      for (const r of byStatus) ordersByStatus[r.status] = r.n;
      const summary: AdminSummaryDTO = {
        todayRevenue: Number(revenue[0]?.revenue ?? 0),
        todayOrders: Number(revenue[0]?.orders ?? 0),
        ordersByStatus,
        lowStockCount: Number(low[0]?.n ?? 0),
        chatSessionsLast7Days: Number(chats[0]?.n ?? 0),
      };
      res.json(summary);
    }),
  );

  router.get(
    '/payments',
    handler(async (req, res) => {
      const q = parseQuery(pageQuery.extend({ status: z.string().trim().max(30).optional() }), req);
      const where = q.status ? eq(payments.status, q.status) : undefined;
      const [rows, [{ total } = { total: 0 }]] = await Promise.all([
        db
          .select({ p: payments, code: orders.code })
          .from(payments)
          .leftJoin(orders, eq(orders.id, payments.orderId))
          .where(where)
          .orderBy(desc(payments.createdAt))
          .limit(q.pageSize)
          .offset((q.page - 1) * q.pageSize),
        db.select({ total: count() }).from(payments).where(where),
      ]);
      res.json({
        items: rows.map((r) => toAdminPaymentDTO(r.p, r.code)),
        page: q.page,
        pageSize: q.pageSize,
        total,
      });
    }),
  );

  return router;
}
