'use client';

import type { BenchmarkDTO } from '@pc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Gauge, Save } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useMemo, useState } from 'react';
import { CATEGORY_COLOR } from '@/components/domain/category';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi, type BenchmarkInput } from '../api';
import { errorMessage, localizeIssue } from '../errors';
import { formatDate } from '../format';
import { QueryError, SearchBox, TableFrame, TableSkeleton, tableClass, td, th } from '../ui';
import { useListParams } from '../use-list-params';

type BenchCategory = 'cpu' | 'gpu';
type ScoreKey = 'cpuSingle' | 'cpuMulti' | 'gpuScore';

const COLUMNS: Record<BenchCategory, { key: ScoreKey; label: string; hint: string }[]> = {
  cpu: [
    { key: 'cpuSingle', label: 'Đơn nhân', hint: 'Điểm đơn nhân (ví dụ Cinebench R23 single)' },
    { key: 'cpuMulti', label: 'Đa nhân', hint: 'Điểm đa nhân (ví dụ Cinebench R23 multi)' },
  ],
  gpu: [{ key: 'gpuScore', label: 'Điểm đồ họa', hint: 'Điểm raster (ví dụ 3DMark Time Spy graphics)' }],
};

interface RowDraft {
  cpuSingle: string;
  cpuMulti: string;
  gpuScore: string;
  source: string;
}

const toText = (n: number | null) => (n === null ? '' : String(n));

function draftOf(b: BenchmarkDTO): RowDraft {
  return {
    cpuSingle: toText(b.cpuSingle),
    cpuMulti: toText(b.cpuMulti),
    gpuScore: toText(b.gpuScore),
    source: b.source ?? '',
  };
}

/** Empty clears the score; anything else must be a positive integer. */
function parseScore(text: string): number | null | 'invalid' {
  const t = text.trim().replace(/\./g, '');
  if (t === '') return null;
  return /^\d+$/.test(t) && Number(t) > 0 ? Number(t) : 'invalid';
}

function BenchmarkRow({
  item,
  category,
  max,
}: {
  item: BenchmarkDTO;
  category: BenchCategory;
  max: Record<ScoreKey, number>;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<RowDraft>(() => draftOf(item));
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const columns = COLUMNS[category];
  const original = draftOf(item);
  const dirty = (Object.keys(draft) as (keyof RowDraft)[]).some(
    (k) => draft[k].trim() !== original[k].trim(),
  );

  const save = useMutation({
    mutationFn: (input: BenchmarkInput) => adminApi.putBenchmark(item.productId, input),
    onSuccess: (saved) => {
      qc.setQueryData<BenchmarkDTO[]>(queryKeys.admin.benchmarks(category), (list) =>
        list?.map((b) => (b.productId === saved.productId ? saved : b)),
      );
      setDraft(draftOf(saved));
      setError(null);
      setSavedAt(Date.now());
    },
    onError: (err) => {
      setError(errorMessage(err));
      toast({ title: 'Chưa lưu được điểm benchmark', description: item.productName, tone: 'error' });
    },
  });

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const input: BenchmarkInput = { source: draft.source.trim() || null };
    for (const c of columns) {
      const v = parseScore(draft[c.key]);
      if (v === 'invalid') {
        setError(`${c.label}: ${localizeIssue('Invalid input: expected int')}, lớn hơn 0`);
        return;
      }
      input[c.key] = v;
    }
    save.mutate(input);
  };

  const formId = `bench-${item.productId}`;
  return (
    <tr className={cn('align-top hover:bg-surface-2', dirty && 'bg-accent/5')}>
      <td className={cn(td, 'min-w-60')}>
        <form id={formId} onSubmit={submit} />
        <Link
          href={`/admin/products/${item.productId}`}
          className="focus-ring line-clamp-2 rounded-xs font-medium text-fg hover:text-accent-ink hover:underline"
        >
          {item.productName}
        </Link>
        {error && (
          <p role="alert" className="mt-1 text-xs font-medium text-danger-ink">
            {error}
          </p>
        )}
      </td>
      {columns.map((c) => {
        const value = parseScore(draft[c.key]);
        const share = typeof value === 'number' && max[c.key] > 0 ? value / max[c.key] : 0;
        return (
          <td key={c.key} className={cn(td, 'w-40')}>
            <Input
              form={formId}
              mono
              size="sm"
              inputMode="numeric"
              value={draft[c.key]}
              aria-label={`${c.label} của ${item.productName}`}
              invalid={value === 'invalid'}
              placeholder="Chưa có"
              onChange={(e) => {
                setError(null);
                setDraft((d) => ({ ...d, [c.key]: e.target.value }));
              }}
            />
            <div className="mt-1.5 h-1 rounded-full bg-surface-3" aria-hidden>
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${Math.min(1, share) * 100}%`, background: CATEGORY_COLOR[category] }}
              />
            </div>
          </td>
        );
      })}
      <td className={cn(td, 'w-56')}>
        <Input
          form={formId}
          size="sm"
          value={draft.source}
          maxLength={100}
          aria-label={`Nguồn số liệu của ${item.productName}`}
          placeholder="Nguồn số liệu"
          onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
        />
      </td>
      <td className={cn(td, 'whitespace-nowrap pt-4 text-xs text-muted')}>{formatDate(item.updatedAt)}</td>
      <td className={cn(td, 'w-28 text-end')}>
        {dirty || save.isPending ? (
          <Button type="submit" form={formId} size="sm" loading={save.isPending}>
            <Save aria-hidden />
            Lưu
          </Button>
        ) : savedAt ? (
          <span className="inline-flex h-8 items-center gap-1 text-xs font-medium text-ok-ink" role="status">
            <Check className="size-4" aria-hidden /> Đã lưu
          </span>
        ) : null}
      </td>
    </tr>
  );
}

export function BenchmarksPage() {
  const { get, set } = useListParams();
  const category: BenchCategory = get('category') === 'gpu' ? 'gpu' : 'cpu';
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: queryKeys.admin.benchmarks(category),
    queryFn: () => adminApi.benchmarks(category),
  });
  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data ?? []).filter((b) => !needle || b.productName.toLowerCase().includes(needle));
  }, [query.data, search]);
  const max = useMemo(() => {
    const m: Record<ScoreKey, number> = { cpuSingle: 0, cpuMulti: 0, gpuScore: 0 };
    for (const b of query.data ?? []) {
      m.cpuSingle = Math.max(m.cpuSingle, b.cpuSingle ?? 0);
      m.cpuMulti = Math.max(m.cpuMulti, b.cpuMulti ?? 0);
      m.gpuScore = Math.max(m.gpuScore, b.gpuScore ?? 0);
    }
    return m;
  }, [query.data]);
  const missing = (query.data ?? []).filter((b) => COLUMNS[category].some((c) => b[c.key] === null)).length;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title="Benchmark" />
      <p className="max-w-3xl text-sm text-muted">
        Điểm benchmark được chuẩn hóa về thang 0–100 trong từng danh mục để tính điểm hiệu năng của cấu hình
        (CPU: đơn nhân và đa nhân theo trọng số con của từng nhu cầu; GPU: điểm raster). Lưu một dòng sẽ làm
        mới bộ nhớ đệm gợi ý. Nhấn Enter trong ô để lưu nhanh.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={category} onValueChange={(v) => set({ category: v })}>
          <TabsList aria-label="Danh mục benchmark">
            <TabsTrigger value="cpu">CPU</TabsTrigger>
            <TabsTrigger value="gpu">Card đồ họa</TabsTrigger>
          </TabsList>
        </Tabs>
        <SearchBox
          value={search}
          onSearch={setSearch}
          delay={150}
          placeholder="Lọc theo tên sản phẩm"
          aria-label="Lọc benchmark theo tên"
          className="sm:w-72"
        />
      </div>
      {query.data && missing > 0 && (
        <p className="text-sm text-warn-ink">
          {missing} sản phẩm chưa đủ điểm; bộ máy sẽ ước lượng điểm từ thông số cho các sản phẩm này.
        </p>
      )}
      <TableFrame>
        {query.isPending ? (
          <TableSkeleton cols={5} />
        ) : query.isError ? (
          <QueryError error={query.error} onRetry={() => query.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            compact
            icon={<Gauge />}
            title={search ? 'Không có sản phẩm phù hợp' : 'Chưa có sản phẩm trong danh mục'}
            description={
              search ? 'Thử từ khóa ngắn hơn, ví dụ "7600".' : 'Thêm sản phẩm ở trang Sản phẩm trước.'
            }
          />
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Sản phẩm</th>
                {COLUMNS[category].map((c) => (
                  <th key={c.key} className={th} title={c.hint}>
                    {c.label}
                  </th>
                ))}
                <th className={th}>Nguồn</th>
                <th className={th}>Cập nhật</th>
                <th className={th}>
                  <span className="sr-only">Lưu</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <BenchmarkRow key={b.productId} item={b} category={category} max={max} />
              ))}
            </tbody>
          </table>
        )}
      </TableFrame>
    </div>
  );
}
