'use client';

import { CATEGORY_KEYS, type CategoryDTO } from '@pc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, Lock, Plus, RotateCcw, Save, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader, useAdminRole } from '../AdminChrome';
import { adminApi } from '../api';
import { DynamicSpecForm } from '../DynamicSpecForm';
import { errorMessage } from '../errors';
import { PageSkeleton, QueryError, ReadOnlyNote } from '../ui';
import { pickEnum, useListParams } from '../use-list-params';
import {
  engineKeys,
  hasOptions,
  newRow,
  rowErrors,
  type SchemaRow,
  SPEC_TYPES,
  toFields,
  toRows,
  validateRows,
} from './schema-form';
import { type SpecDraft, type SpecDraftValue, specsToDraft } from './spec-form';

function SchemaEditor({ category, canEdit }: { category: CategoryDTO; canEdit: boolean }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<SchemaRow[]>(() => toRows(category.specSchema));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const locked = useMemo(() => engineKeys(category.key), [category.key]);
  const fields = useMemo(() => toFields(rows), [rows]);
  const dirty = JSON.stringify(fields) !== JSON.stringify(category.specSchema);
  const [preview, setPreview] = useState<SpecDraft>(() => specsToDraft(category.specSchema, {}));

  const update = (rowId: string, patch: Partial<SchemaRow>) => {
    setRows((rs) => rs.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[`${rowId}.${k}`];
      return next;
    });
  };
  const move = (index: number, delta: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      const [row] = next.splice(index, 1);
      next.splice(index + delta, 0, row!);
      return next;
    });

  const save = useMutation({
    mutationFn: () => adminApi.setCategorySchema(category.id, fields),
    onSuccess: (saved) => {
      qc.setQueryData<CategoryDTO[]>(queryKeys.categories, (list) =>
        list?.map((c) => (c.id === saved.id ? saved : c)),
      );
      void qc.invalidateQueries({ queryKey: queryKeys.categories });
      setErrors({});
      setFormError(null);
      toast({
        title: `Đã lưu lược đồ ${saved.name}`,
        description: 'Biểu mẫu sản phẩm và bộ lọc cửa hàng dùng ngay lược đồ mới.',
        tone: 'success',
      });
    },
    onError: (err) => {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        const mapped = rowErrors(rows, err.details as { path: string; message: string }[]);
        setErrors(mapped.errors);
        setFormError(
          mapped.rest.length ? mapped.rest.join(' · ') : 'Máy chủ từ chối lược đồ, xem các ô đánh dấu đỏ.',
        );
      } else {
        setFormError(errorMessage(err));
      }
      toast({ title: 'Chưa lưu được lược đồ', description: errorMessage(err), tone: 'error' });
    },
  });

  const submit = () => {
    const local = validateRows(rows);
    setErrors(local);
    if (Object.keys(local).length > 0) {
      setFormError('Kiểm tra các ô được đánh dấu đỏ.');
      return;
    }
    setFormError(null);
    save.mutate();
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <Card className="min-w-0">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Các trường thông số · {category.name}</CardTitle>
            <CardDescription>
              {rows.length} trường. Thứ tự ở đây là thứ tự trên biểu mẫu sản phẩm và bảng thông số.
            </CardDescription>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!dirty || save.isPending}
                onClick={() => {
                  setRows(toRows(category.specSchema));
                  setErrors({});
                  setFormError(null);
                }}
              >
                <RotateCcw aria-hidden />
                Hoàn tác
              </Button>
              <Button size="sm" onClick={submit} loading={save.isPending} disabled={!dirty}>
                <Save aria-hidden />
                Lưu lược đồ
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {formError && (
            <div
              role="alert"
              className="rounded-md border border-danger/40 bg-danger/8 px-4 py-3 text-sm text-danger-ink"
            >
              {formError}
            </div>
          )}
          <ol className="flex flex-col gap-3">
            {rows.map((row, i) => {
              const isLocked = locked.has(row.key) && category.specSchema.some((f) => f.key === row.key);
              const err = (prop: string) => errors[`${row.rowId}.${prop}`];
              return (
                <li
                  key={row.rowId}
                  className={cn(
                    'grid gap-3 rounded-md border border-border bg-surface-2 p-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]',
                    Object.keys(errors).some((k) => k.startsWith(`${row.rowId}.`)) && 'border-danger/50',
                  )}
                >
                  <Field label="Khóa JSONB" error={err('key')}>
                    <Input
                      mono
                      size="sm"
                      value={row.key}
                      disabled={!canEdit || isLocked}
                      onChange={(e) => update(row.rowId, { key: e.target.value })}
                      trailing={
                        isLocked ? (
                          <Lock className="size-3.5" aria-label="Bộ luật tương thích dùng khóa này" />
                        ) : undefined
                      }
                    />
                  </Field>
                  <Field label="Nhãn hiển thị" error={err('label')}>
                    <Input
                      size="sm"
                      value={row.label}
                      disabled={!canEdit}
                      onChange={(e) => update(row.rowId, { label: e.target.value })}
                    />
                  </Field>
                  <Field label="Kiểu" error={err('type')}>
                    <Select
                      size="sm"
                      value={row.type}
                      disabled={!canEdit || isLocked}
                      onValueChange={(v) => update(row.rowId, { type: v as SchemaRow['type'] })}
                      options={SPEC_TYPES}
                    />
                  </Field>
                  <Field label="Đơn vị" error={err('unit')}>
                    <Input
                      size="sm"
                      value={row.unit}
                      disabled={!canEdit}
                      placeholder="GHz, W, mm…"
                      onChange={(e) => update(row.rowId, { unit: e.target.value })}
                    />
                  </Field>
                  <div className="flex items-end justify-end gap-1 sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:flex-col lg:justify-start">
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                          aria-label={`Đưa ${row.label || 'trường'} lên`}
                        >
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={i === rows.length - 1}
                          onClick={() => move(i, 1)}
                          aria-label={`Đưa ${row.label || 'trường'} xuống`}
                        >
                          <ArrowDown aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isLocked}
                          onClick={() => setRows((rs) => rs.filter((r) => r.rowId !== row.rowId))}
                          aria-label={`Xóa trường ${row.label || row.key}`}
                        >
                          <X aria-hidden />
                        </Button>
                      </>
                    )}
                  </div>
                  <Field
                    label="Danh sách giá trị"
                    error={err('options')}
                    hint={hasOptions(row.type) ? 'Cách nhau bằng dấu phẩy.' : 'Chỉ dùng cho kiểu lựa chọn.'}
                    className="sm:col-span-2"
                  >
                    <Input
                      mono
                      size="sm"
                      value={row.options}
                      disabled={!canEdit || !hasOptions(row.type)}
                      onChange={(e) => update(row.rowId, { options: e.target.value })}
                    />
                  </Field>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:col-span-2 sm:pt-6">
                    <Checkbox
                      label="Bắt buộc"
                      checked={row.required}
                      disabled={!canEdit}
                      onCheckedChange={(c) => update(row.rowId, { required: c === true })}
                    />
                    <Checkbox
                      label="Dùng làm bộ lọc"
                      checked={row.filterable}
                      disabled={!canEdit}
                      onCheckedChange={(c) => update(row.rowId, { filterable: c === true })}
                    />
                    {isLocked && (
                      <Badge tone="outline" size="sm">
                        <Lock aria-hidden />
                        Bộ luật tương thích dùng
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {canEdit && (
            <Button variant="secondary" className="w-fit" onClick={() => setRows((rs) => [...rs, newRow()])}>
              <Plus aria-hidden />
              Thêm trường
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="xl:sticky xl:top-24">
        <CardHeader>
          <CardTitle>Xem trước biểu mẫu</CardTitle>
          <CardDescription>Biểu mẫu sản phẩm sinh từ lược đồ đang sửa (chưa lưu cũng hiện).</CardDescription>
        </CardHeader>
        <CardContent>
          <DynamicSpecForm
            fields={fields.filter((f) => f.key && f.label)}
            value={preview}
            onChange={(key: string, v: SpecDraftValue) => setPreview((p) => ({ ...p, [key]: v }))}
            className="sm:grid-cols-1"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function SpecSchemaPage() {
  const { isAdmin } = useAdminRole();
  const { get, set } = useListParams();
  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: adminApi.categories,
    staleTime: 60_000,
  });
  const key = pickEnum(get('category'), CATEGORY_KEYS) ?? 'cpu';
  const category = categories.data?.find((c) => c.key === key);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title="Lược đồ thông số" />
      <Button asChild variant="link" size="sm" className="w-fit">
        <Link href="/admin/products">
          <ArrowLeft aria-hidden />
          Danh sách sản phẩm
        </Link>
      </Button>
      <p className="max-w-3xl text-sm text-muted">
        Mỗi danh mục lưu một lược đồ thông số dạng JSONB. Lược đồ sinh ra biểu mẫu nhập sản phẩm, bảng thông
        số và bộ lọc động trên cửa hàng. Các khóa có biểu tượng khóa được bộ luật tương thích (C01–C14) đọc
        nên không đổi tên hay kiểu được.
      </p>
      {!isAdmin && (
        <ReadOnlyNote>
          Chỉ quản trị viên được sửa lược đồ thông số. Bạn đang xem ở chế độ chỉ đọc.
        </ReadOnlyNote>
      )}
      {categories.isPending ? (
        <PageSkeleton />
      ) : categories.isError || !category ? (
        <Card>
          <QueryError
            error={categories.error}
            onRetry={() => categories.refetch()}
            title="Không tải được danh mục"
          />
        </Card>
      ) : (
        <>
          <Tabs value={key} onValueChange={(v) => set({ category: v })}>
            <TabsList aria-label="Danh mục">
              {categories.data.map((c) => (
                <TabsTrigger key={c.key} value={c.key}>
                  {c.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <SchemaEditor
            key={`${category.id}:${JSON.stringify(category.specSchema)}`}
            category={category}
            canEdit={isAdmin}
          />
        </>
      )}
    </div>
  );
}
