'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChartNoAxesColumn } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Price } from '@/components/ui/Price';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { formatVnd } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { adminApi, type RevenueGroupBy } from './api';
import { shopDay } from './format';
import { formatAxisVnd, periodLabel, periodTitle, revenueRange, revenueTotals } from './revenue';
import { QueryError, refetchClass, tableClass, td, th, thEnd } from './ui';

const GROUPS: { value: RevenueGroupBy; label: string; window: string }[] = [
  { value: 'day', label: 'Ngày', window: '30 ngày gần nhất' },
  { value: 'week', label: 'Tuần', window: '12 tuần gần nhất' },
  { value: 'month', label: 'Tháng', window: '12 tháng gần nhất' },
];

interface Row {
  period: string;
  label: string;
  revenue: number;
  orders: number;
}

function RevenueTooltip({ active, payload, groupBy }: TooltipContentProps & { groupBy: RevenueGroupBy }) {
  const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
  if (!row) return null;
  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2 text-sm shadow-overlay">
      <div className="font-mono font-semibold text-fg tabular-nums">{formatVnd(row.revenue)}</div>
      <div className="text-xs text-muted">
        {periodTitle(row.period, groupBy)} · {row.orders} đơn
      </div>
    </div>
  );
}

/** Paid revenue (PAID → COMPLETED, by payment time) as one series of columns; values also in a table. */
export function RevenueChart() {
  const [groupBy, setGroupBy] = useState<RevenueGroupBy>('day');
  const range = useMemo(() => revenueRange(groupBy, shopDay(new Date())), [groupBy]);
  const query = useQuery({
    queryKey: queryKeys.admin.revenue(`${range.groupBy}:${range.from}:${range.to}`),
    queryFn: () => adminApi.revenue(range),
    placeholderData: keepPreviousData,
  });
  const rows: Row[] = useMemo(
    () => (query.data ?? []).map((p) => ({ ...p, label: periodLabel(p.period, groupBy) })),
    [query.data, groupBy],
  );
  const totals = revenueTotals(query.data ?? []);
  const group = GROUPS.find((g) => g.value === groupBy)!;

  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-fg">Doanh thu</h2>
          <p className="text-sm text-muted">
            {group.window} · đơn đã thanh toán ·{' '}
            {query.data ? (
              <>
                <Price amount={totals.revenue} size="sm" /> từ{' '}
                <span className="font-mono tabular-nums">{totals.orders}</span> đơn
              </>
            ) : (
              '…'
            )}
          </p>
        </div>
        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as RevenueGroupBy)}>
          <TabsList aria-label="Gộp doanh thu theo">
            {GROUPS.map((g) => (
              <TabsTrigger key={g.value} value={g.value}>
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="px-2 pb-2 sm:px-3">
        {query.isPending ? (
          <Skeleton className="mx-3 my-2 h-[260px]" />
        ) : query.isError && !query.data ? (
          <QueryError error={query.error} onRetry={() => query.refetch()} />
        ) : totals.revenue === 0 ? (
          <EmptyState
            compact
            icon={<ChartNoAxesColumn />}
            title="Chưa có doanh thu trong khoảng này"
            description="Doanh thu chỉ tính đơn đã nhận tiền (từ Đã thanh toán đến Hoàn thành). Đơn được đối soát VietQR sẽ hiện ở đây."
            className="h-[260px] justify-center"
          />
        ) : (
          <div
            className={refetchClass(query.isFetching, true)}
            role="img"
            aria-label={`Biểu đồ cột doanh thu ${group.window}, tổng ${formatVnd(totals.revenue)}`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeWidth={1} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                  interval="preserveStartEnd"
                  minTickGap={12}
                  tickMargin={8}
                />
                <YAxis
                  tickFormatter={formatAxisVnd}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--color-muted)', fontSize: 12 }}
                  width={56}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-surface-2)' }}
                  content={(props) => <RevenueTooltip {...props} groupBy={groupBy} />}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="revenue"
                  name="Doanh thu"
                  fill="var(--color-ring)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {rows.length > 0 && totals.revenue > 0 && (
        <details className="group border-t border-border">
          <summary className="focus-ring cursor-pointer list-none px-5 py-3 text-sm font-medium text-accent-ink hover:underline">
            Xem số liệu dạng bảng
          </summary>
          <div className="max-h-72 overflow-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={th}>Kỳ</th>
                  <th className={thEnd}>Doanh thu</th>
                  <th className={thEnd}>Số đơn</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period}>
                    <td className={td}>{periodTitle(r.period, groupBy)}</td>
                    <td className={`${td} text-end font-mono tabular-nums`}>{formatVnd(r.revenue)}</td>
                    <td className={`${td} text-end font-mono tabular-nums`}>{r.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}
