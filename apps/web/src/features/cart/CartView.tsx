'use client';

import { BUILD_LABEL_TEXT, type BuildDTO, type CartItemDTO } from '@pc/shared';
import {
  ArrowRight,
  CircleCheck,
  Cpu,
  FileText,
  PackageOpen,
  ShoppingCart,
  Trash2,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { ProductImage } from '@/components/domain/ProductImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Price } from '@/components/ui/Price';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { MAX_LINE_QTY } from '../checkout/constants';
import { useBuilds, useCart, useRemoveCartItem, useUpdateCartItem } from './hooks';
import {
  assemblableBuildId,
  type BuildGroup,
  cartAssemblyFee,
  groupCartLines,
  isBuildComplete,
} from './lines';
import { openPersonalPdf } from './pdf';
import { QtyStepper } from './QtyStepper';

function CartLine({ item }: { item: CartItemDTO }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const { product } = item;
  const unit = product.salePrice ?? product.price;
  const maxQty = Math.max(1, Math.min(MAX_LINE_QTY, product.stock));
  const short = product.stock < item.qty;
  const busy = update.isPending || remove.isPending;

  return (
    <li className={cn('flex gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4', busy && 'opacity-60')}>
      <Link href={`/p/${product.slug}`} className="focus-ring shrink-0 rounded-sm" tabIndex={-1} aria-hidden>
        <ProductImage
          src={product.image}
          alt=""
          category={product.category}
          designator={false}
          sizes="96px"
          className="w-20 sm:w-24"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-muted">{product.brand}</span>
          <Link
            href={`/p/${product.slug}`}
            className="focus-ring line-clamp-2 rounded-xs text-sm font-semibold text-fg hover:text-accent-ink"
          >
            {product.name}
          </Link>
          <span className="text-xs text-muted">
            Đơn giá <Price amount={unit} size="sm" tone="muted" className="text-xs" />
          </span>
          {short && (
            <span className="text-xs font-medium text-warn-ink">
              {product.stock > 0
                ? `Kho chỉ còn ${product.stock}, hãy giảm số lượng`
                : 'Sản phẩm vừa hết hàng'}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
          <QtyStepper
            size="sm"
            label={`Số lượng ${product.name}`}
            value={item.qty}
            max={Math.max(maxQty, item.qty)}
            disabled={busy}
            onChange={(qty) => update.mutate({ id: item.id, qty })}
          />
          <Price amount={item.lineTotal} size="md" className="min-w-28 justify-end" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Xóa ${product.name} khỏi giỏ`}
            onClick={() => remove.mutate(item.id)}
            disabled={busy}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

function BuildGroupCard({ group, build }: { group: BuildGroup; build?: BuildDTO }) {
  const complete = build ? isBuildComplete(build, group) : null;
  return (
    <section
      aria-label={build ? `Cấu hình ${build.name}` : 'Cấu hình PC'}
      className="rounded-md border border-border bg-surface"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-graphite-950 text-cyan">
            <Cpu className="size-4" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-fg">{build?.name ?? 'Cấu hình PC'}</span>
            <span className="text-xs text-muted">{group.items.length} linh kiện</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {build?.label && <Badge size="sm">{BUILD_LABEL_TEXT[build.label]}</Badge>}
          {complete === true && (
            <Badge tone="ok" size="sm">
              <CircleCheck aria-hidden />
              Đủ bộ
            </Badge>
          )}
          {complete === false && (
            <Badge tone="warn" size="sm">
              Thiếu linh kiện
            </Badge>
          )}
          <Link
            href={`/builds/${group.buildId}`}
            className="focus-ring rounded-xs text-sm font-medium text-accent-ink hover:underline"
          >
            Xem cấu hình
          </Link>
        </div>
      </header>
      <ul className="divide-y divide-border px-4 py-4 sm:px-5">
        {group.items.map((item) => (
          <CartLine key={item.id} item={item} />
        ))}
      </ul>
      <footer className="flex items-center justify-between border-t border-border px-4 py-3 text-sm sm:px-5">
        <span className="text-muted">Tạm tính cấu hình</span>
        <Price amount={group.subtotal} size="md" />
      </footer>
    </section>
  );
}

function CartSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-busy>
      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5">
        {Array.from({ length: 3 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
          <div key={i} className="flex gap-4">
            <Skeleton className="aspect-[4/3] w-24 rounded-sm" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export function CartView() {
  const { data: cart, isPending, isError, refetch } = useCart();
  const grouped = groupCartLines(cart?.items ?? []);
  const { byId: builds } = useBuilds(grouped.builds.map((g) => g.buildId));
  const assembleId = assemblableBuildId(grouped, builds);
  const assembleGroup = grouped.builds.find((g) => g.buildId === assembleId);
  const assemblyFee = cartAssemblyFee(cart);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-fg">Giỏ hàng</h1>
          {cart && cart.itemCount > 0 && (
            <p className="text-sm text-muted">{formatNumber(cart.itemCount)} sản phẩm</p>
          )}
        </div>
        {cart && cart.items.length > 0 && (
          <Button
            variant="outline"
            onClick={() => void openPersonalPdf('/quotes/cart.pdf', 'bao-gia-gio-hang.pdf')}
          >
            <FileText aria-hidden />
            Xuất báo giá PDF
          </Button>
        )}
      </div>

      {isPending ? (
        <CartSkeleton />
      ) : isError ? (
        <EmptyState
          tone="error"
          icon={<ShoppingCart />}
          title="Chưa tải được giỏ hàng"
          description="Máy chủ không phản hồi. Sản phẩm trong giỏ vẫn được giữ, hãy thử lại."
          actions={<Button onClick={() => void refetch()}>Thử lại</Button>}
        />
      ) : !cart || cart.items.length === 0 ? (
        <EmptyState
          icon={<PackageOpen />}
          title="Giỏ hàng đang trống"
          description="Chọn linh kiện lẻ, hoặc để AI dựng cả bộ máy đúng ngân sách rồi bấm “Mua cả bộ”."
          actions={
            <>
              <Button asChild variant="workshop">
                <Link href="/advisor">Hỏi AI tư vấn cấu hình</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/c/cpu">Xem linh kiện</Link>
              </Button>
            </>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-4">
            {grouped.builds.map((g) => (
              <BuildGroupCard key={g.buildId} group={g} build={builds.get(g.buildId)} />
            ))}
            {grouped.retail.length > 0 && (
              <section aria-labelledby="cart-retail" className="rounded-md border border-border bg-surface">
                <h2
                  id="cart-retail"
                  className="border-b border-border px-4 py-3 text-sm font-semibold text-fg sm:px-5"
                >
                  {grouped.builds.length > 0 ? 'Linh kiện mua lẻ' : 'Sản phẩm'}
                </h2>
                <ul className="divide-y divide-border px-4 py-4 sm:px-5">
                  {grouped.retail.map((item) => (
                    <CartLine key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside
            aria-label="Tóm tắt đơn hàng"
            className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-32"
          >
            <h2 className="text-lg font-semibold text-fg">Tóm tắt</h2>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Tạm tính</dt>
                <dd>
                  <Price amount={cart.subtotal} size="md" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Phí vận chuyển</dt>
                <dd className="font-medium text-ok-ink">Miễn phí</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                <dt className="font-semibold text-fg">Tổng</dt>
                <dd>
                  <Price amount={cart.subtotal} size="xl" />
                </dd>
              </div>
            </dl>
            <Button asChild size="lg">
              <Link href="/checkout">
                Thanh toán
                <ArrowRight aria-hidden />
              </Link>
            </Button>

            {assembleId && assembleGroup && (
              <div className="flex flex-col gap-3 rounded-md border border-accent/40 bg-accent/8 p-4">
                <div className="flex items-start gap-2.5">
                  <Wrench className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-fg">Đặt lắp ráp nguyên bộ</span>
                    <span className="text-sm text-muted">
                      Kỹ thuật viên lắp sẵn, đi dây gọn và test máy trước khi giao. Phí lắp ráp{' '}
                      <Price amount={assemblyFee} size="sm" className="text-fg" />.
                    </span>
                    {grouped.retail.length > 0 && (
                      <span className="text-xs text-muted">
                        Linh kiện mua lẻ vẫn ở lại giỏ để bạn đặt riêng.
                      </span>
                    )}
                  </div>
                </div>
                <Button asChild variant="workshop">
                  <Link href={`/checkout?build=${assembleId}`}>
                    Đặt lắp ráp ·{' '}
                    <Price
                      amount={assembleGroup.subtotal + assemblyFee}
                      size="sm"
                      className="text-graphite-100"
                    />
                  </Link>
                </Button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
