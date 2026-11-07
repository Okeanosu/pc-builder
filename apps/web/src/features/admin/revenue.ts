import type { RevenuePointDTO } from '@pc/shared';
import type { RevenueGroupBy, RevenueQuery } from './api';

const DAY_MS = 24 * 3600 * 1000;

function shiftDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Default windows: 30 days, 12 weeks or 12 months ending on `today` (YYYY-MM-DD, shop time). */
export function revenueRange(groupBy: RevenueGroupBy, today: string): RevenueQuery {
  if (groupBy === 'day') return { groupBy, from: shiftDays(today, -29), to: today };
  if (groupBy === 'week') return { groupBy, from: shiftDays(today, -7 * 11), to: today };
  const [y, m] = today.split('-').map(Number) as [number, number];
  const start = new Date(Date.UTC(y, m - 1 - 11, 1)).toISOString().slice(0, 10);
  return { groupBy, from: start, to: today };
}

/** "2026-11-07" → "07/11"; months "2026-11" → "11/2026". */
export function periodLabel(period: string, groupBy: RevenueGroupBy): string {
  if (groupBy === 'month') {
    const [y, m] = period.split('-');
    return `${m}/${y}`;
  }
  const [, m, d] = period.split('-');
  return `${d}/${m}`;
}

export function periodTitle(period: string, groupBy: RevenueGroupBy): string {
  if (groupBy === 'month') return `Tháng ${periodLabel(period, groupBy)}`;
  const [y, m, d] = period.split('-');
  return groupBy === 'week' ? `Tuần từ ${d}/${m}/${y}` : `Ngày ${d}/${m}/${y}`;
}

const compact = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

/** Axis ticks: 0 · 500 N · 25 tr · 1,2 tỷ (one style per axis, vi-VN decimals). */
export function formatAxisVnd(amount: number): string {
  if (amount === 0) return '0';
  if (Math.abs(amount) >= 1_000_000_000) return `${compact.format(amount / 1_000_000_000)} tỷ`;
  if (Math.abs(amount) >= 1_000_000) return `${compact.format(amount / 1_000_000)} tr`;
  if (Math.abs(amount) >= 1_000) return `${compact.format(amount / 1_000)} N`;
  return compact.format(amount);
}

export function revenueTotals(points: RevenuePointDTO[]): { revenue: number; orders: number } {
  return points.reduce((acc, p) => ({ revenue: acc.revenue + p.revenue, orders: acc.orders + p.orders }), {
    revenue: 0,
    orders: 0,
  });
}
