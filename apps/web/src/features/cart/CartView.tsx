'use client';

import { BUILD_LABEL_TEXT, type BuildDTO, CATEGORY_LABELS, type CartItemDTO } from '@pc/shared';
import {
  ArrowRight,
  CircleCheck,
  FileText,
  PackageOpen,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { CATEGORY_COLOR } from '@/components/domain/category';
import { ProductImage } from '@/components/domain/ProductImage';
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
    <li className={cn('flex gap-3 border-b border-border py-4 sm:gap-4', busy && 'opacity-60')}>
      <Link href={`/p/${product.slug}`} className="focus-ring shrink-0 rounded-sm" tabIndex={-1} aria-hidden>
        <ProductImage
          src={product.image}
          alt=""
          category={product.category}
          sizes="96px"
          className="w-20 sm:w-24"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 text-xs text-muted">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: CATEGORY_COLOR[product.category] }}
            />
            {CATEGORY_LABELS[product.category]} · {product.brand}
          </span>
          <Link
            href={`/p/${product.slug}`}
            className="focus-ring line-clamp-2 rounded-xs text-sm font-medium text-fg decoration-1 underline-offset-[3px] hover:underline"
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
    <section aria-label={build ? `Cấu hình ${build.name}` : 'Cấu hình PC'} className="flex flex-col">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-fg pb-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="truncate text-lg font-semibold text-fg">{build?.name ?? 'Cấu hình PC'}</h2>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="tabular-nums">{group.items.length} linh kiện</span>
            {build?.label && <span>{BUILD_LABEL_TEXT[build.label]}</span>}
            {complete === true && (
              <span className="inline-flex items-center gap-1 font-medium text-ok-ink">
                <CircleCheck className="size-3.5" aria-hidden />
                Đủ bộ
              </span>
            )}
            {complete === false && (
              <span className="inline-flex items-center gap-1 font-medium text-warn-ink">
                <TriangleAlert className="size-3.5" aria-hidden />
                Thiếu linh kiện
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/builds/${group.buildId}`}
          className="focus-ring shrink-0 rounded-xs text-sm font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-current"
        >
          Xem cấu hình
        </Link>
      </header>
      <ul className="flex flex-col">
        {group.items.map((item) => (
          <CartLine key={item.id} item={item} />
        ))}
      </ul>
      <div className="flex items-baseline justify-between gap-3 py-3 text-sm">
        <span className="text-muted">Tạm tính cấu hình</span>
        <Price amount={group.subtotal} size="md" />
      </div>
    </section>
  );
}

function CartSkeleton() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12" aria-busy>
      <div className="flex flex-col border-t border-border">
        {Array.from({ length: 3 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
          <div key={i} className="flex gap-4 border-b border-border py-4">
            <Skeleton className="aspect-[4/3] w-24 rounded-sm" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-6 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
            Giỏ hàng
          </h1>
          {cart && cart.itemCount > 0 && (
            <p className="text-sm text-muted tabular-nums">{formatNumber(cart.itemCount)} sản phẩm</p>
          )}
        </div>
        {cart && cart.items.length > 0 && (
          <Button
            variant="ghost"
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
              <Button asChild>
                <Link href="/advisor">Hỏi AI tư vấn cấu hình</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/c/cpu">Xem linh kiện</Link>
              </Button>
            </>
          }
        />
      ) : (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-10">
            {grouped.builds.map((g) => (
              <BuildGroupCard key={g.buildId} group={g} build={builds.get(g.buildId)} />
            ))}
            {grouped.retail.length > 0 && (
              <section aria-labelledby="cart-retail" className="flex flex-col">
                <h2 id="cart-retail" className="border-b border-fg pb-3 text-lg font-semibold text-fg">
                  {grouped.builds.length > 0 ? 'Linh kiện mua lẻ' : 'Sản phẩm'}
                </h2>
                <ul className="flex flex-col">
                  {grouped.retail.map((item) => (
                    <CartLine key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside aria-label="Tóm tắt đơn hàng" className="flex flex-col gap-5 lg:sticky lg:top-32">
            <h2 className="border-b border-border pb-3 text-lg font-semibold text-fg">Tóm tắt</h2>
            <dl className="flex flex-col text-sm">
              <div className="flex items-baseline justify-between gap-3 border-b border-border py-2.5">
                <dt className="text-muted">Tạm tính</dt>
                <dd>
                  <Price amount={cart.subtotal} size="md" />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-muted">Phí vận chuyển</dt>
                <dd className="font-medium text-ok-ink">Miễn phí</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t-2 border-fg pt-3">
                <dt className="font-medium text-fg">Tổng</dt>
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
              <div className="flex flex-col gap-3 border-t border-border pt-5">
                <div className="flex flex-col gap-1">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <Wrench className="size-4 shrink-0" aria-hidden />
                    Đặt lắp ráp nguyên bộ
                  </h3>
                  <p className="text-sm text-muted">
                    Kỹ thuật viên lắp sẵn, đi dây gọn và test máy trước khi giao. Phí lắp ráp{' '}
                    <Price amount={assemblyFee} size="sm" />.
                  </p>
                  {grouped.retail.length > 0 && (
                    <p className="text-xs text-muted">Linh kiện mua lẻ vẫn ở lại giỏ để bạn đặt riêng.</p>
                  )}
                </div>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/checkout?build=${assembleId}`}>
                    Đặt lắp ráp ·{' '}
                    <Price amount={assembleGroup.subtotal + assemblyFee} size="sm" className="text-current" />
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
