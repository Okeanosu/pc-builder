'use client';

import type { AdminProductDTO } from '@pc/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter } from '@/components/ui/Dialog';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { adminApi } from '../api';
import { errorMessage } from '../errors';
import { type AdjustDraft, checkAdjust } from './stock';

const EMPTY: AdjustDraft = { reason: 'IMPORT', delta: '', note: '' };

export function AdjustStockDialog({
  product,
  onOpenChange,
}: {
  product: AdminProductDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<AdjustDraft>(EMPTY);
  const [serverError, setServerError] = useState<string | null>(null);
  const check = product ? checkAdjust(draft, product) : null;

  const close = (open: boolean) => {
    if (!open) {
      setDraft(EMPTY);
      setServerError(null);
    }
    onOpenChange(open);
  };

  const adjust = useMutation({
    mutationFn: () => adminApi.adjustStock(product!.id, check!.input!),
    onSuccess: ({ product: p, movement }) => {
      qc.setQueryData(queryKeys.admin.product(p.id), p);
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'movements', p.id] });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.summary });
      toast({
        title: movement.delta > 0 ? `Đã nhập thêm ${movement.delta}` : `Đã điều chỉnh ${movement.delta}`,
        description: `${p.name}: còn ${p.stockOnHand} trong kho, bán được ${p.stock}.`,
        tone: 'success',
      });
      close(false);
    },
    onError: (err) => setServerError(errorMessage(err)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (check?.input) adjust.mutate();
  };

  return (
    <Dialog open={product !== null} onOpenChange={close}>
      {product && (
        <DialogContent title="Điều chỉnh tồn kho" description={product.name} size="md">
          <form onSubmit={submit} noValidate>
            <DialogBody className="flex flex-col gap-5">
              <Tabs
                value={draft.reason}
                onValueChange={(v) => setDraft((d) => ({ ...d, reason: v as AdjustDraft['reason'] }))}
              >
                <TabsList aria-label="Loại thay đổi">
                  <TabsTrigger value="IMPORT">Nhập kho</TabsTrigger>
                  <TabsTrigger value="ADJUST">Điều chỉnh (kiểm kê)</TabsTrigger>
                </TabsList>
              </Tabs>
              <Field
                label={draft.reason === 'IMPORT' ? 'Số lượng nhập' : 'Số lượng thay đổi (+/−)'}
                required
                error={check?.error ?? undefined}
                hint={
                  draft.reason === 'IMPORT'
                    ? 'Số dương, ví dụ 10.'
                    : 'Số âm để giảm (hàng lỗi, thất lạc), số dương để tăng.'
                }
              >
                <Input
                  className="tabular-nums"
                  inputMode="numeric"
                  autoFocus
                  value={draft.delta}
                  onChange={(e) => {
                    setServerError(null);
                    setDraft((d) => ({ ...d, delta: e.target.value }));
                  }}
                  placeholder={draft.reason === 'IMPORT' ? '10' : '-2'}
                />
              </Field>
              <Field label="Ghi chú" hint="Lưu vào lịch sử kho, ví dụ số phiếu nhập.">
                <Textarea
                  rows={2}
                  maxLength={300}
                  value={draft.note}
                  onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-3 gap-2 rounded-sm border border-border bg-surface-2 p-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-muted">Trong kho</span>
                  <span className="flex items-center gap-1.5 tabular-nums">
                    {product.stockOnHand}
                    {check?.after !== null && check?.after !== undefined && (
                      <>
                        <ArrowRight className="size-3.5 text-muted" aria-label="thành" />
                        <span className={cn('font-semibold', check.error ? 'text-danger-ink' : 'text-fg')}>
                          {check.after}
                        </span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted">Đang giữ</span>
                  <span className="tabular-nums">{product.reserved}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted">Có thể bán</span>
                  <span className="tabular-nums">
                    {check?.after != null && !check.error ? check.after - product.reserved : product.stock}
                  </span>
                </div>
              </div>
              {serverError && (
                <p role="alert" className="text-sm font-medium text-danger-ink">
                  {serverError}
                </p>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Hủy</Button>
              </DialogClose>
              <Button type="submit" disabled={!check?.input} loading={adjust.isPending}>
                {draft.reason === 'IMPORT' ? 'Nhập kho' : 'Lưu điều chỉnh'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
