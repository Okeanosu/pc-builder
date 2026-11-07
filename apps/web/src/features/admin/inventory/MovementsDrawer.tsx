'use client';

import type { AdminProductDTO, InventoryMovementDTO, MovementReason } from '@pc/shared';
import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { queryKeys } from '@/lib/query-keys';
import { adminApi } from '../api';
import { formatDateTime } from '../format';
import { Pagination, QueryError } from '../ui';
import { MOVEMENT_LABEL } from './stock';

const PAGE_SIZE = 15;

const REASON_TONE: Record<MovementReason, NonNullable<BadgeProps['tone']>> = {
  IMPORT: 'ok',
  ORDER: 'accent',
  CANCEL: 'warn',
  ADJUST: 'neutral',
};

function MovementRow({ m }: { m: InventoryMovementDTO }) {
  const isOrder = (m.reason === 'ORDER' || m.reason === 'CANCEL') && m.ref;
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={REASON_TONE[m.reason]} size="sm">
          {MOVEMENT_LABEL[m.reason]}
        </Badge>
        <span className="text-xs text-muted">{formatDateTime(m.createdAt)}</span>
      </div>
      <span className="row-span-2 self-center font-mono text-base font-semibold text-fg tabular-nums">
        {m.delta > 0 ? `+${m.delta}` : m.delta}
      </span>
      <div className="min-w-0 text-sm text-muted">
        {isOrder ? (
          <Link
            href={`/admin/orders/${m.ref}`}
            className="focus-ring rounded-xs font-mono text-accent-ink hover:underline"
          >
            {m.ref}
          </Link>
        ) : (
          m.ref && <span className="text-fg">{m.ref}</span>
        )}
        {m.actor && <span className="block truncate text-xs">bởi {m.actor.fullName || m.actor.email}</span>}
        {!m.actor && !isOrder && !m.ref && <span className="text-xs">Hệ thống</span>}
      </div>
    </li>
  );
}

export function MovementsDrawer({
  product,
  onOpenChange,
}: {
  product: AdminProductDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const productId = product?.id ?? '';
  const query = useQuery({
    queryKey: queryKeys.admin.movements(productId, page),
    queryFn: () => adminApi.movements(productId, page, PAGE_SIZE),
    enabled: Boolean(product),
  });

  return (
    <Drawer
      open={product !== null}
      onOpenChange={(open) => {
        if (!open) setPage(1);
        onOpenChange(open);
      }}
    >
      {product && (
        <DrawerContent title="Lịch sử kho" description={`${product.name} · ${product.sku}`}>
          <DrawerBody className="grid content-start">
            <div className="grid grid-cols-3 gap-2 rounded-sm border border-border bg-surface-2 p-3 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-muted">Trong kho</span>
                <span className="font-mono tabular-nums">{product.stockOnHand}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted">Đang giữ</span>
                <span className="font-mono tabular-nums">{product.reserved}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted">Có thể bán</span>
                <span className="font-mono tabular-nums">{product.stock}</span>
              </div>
            </div>
            {query.isPending ? (
              <div className="flex flex-col gap-3 py-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : query.isError ? (
              <QueryError error={query.error} onRetry={() => query.refetch()} />
            ) : query.data.items.length === 0 ? (
              <EmptyState
                compact
                icon={<ScrollText />}
                title="Chưa có biến động kho"
                description="Mỗi lần nhập kho, bán ra, hủy đơn hoặc điều chỉnh sẽ được ghi ở đây."
              />
            ) : (
              <ol className="divide-y divide-border">
                {query.data.items.map((m) => (
                  <MovementRow key={m.id} m={m} />
                ))}
              </ol>
            )}
          </DrawerBody>
          {query.data && query.data.total > PAGE_SIZE && (
            <DrawerFooter>
              <Pagination
                className="w-full"
                page={page}
                pageSize={PAGE_SIZE}
                total={query.data.total}
                onPage={setPage}
              />
            </DrawerFooter>
          )}
        </DrawerContent>
      )}
    </Drawer>
  );
}
