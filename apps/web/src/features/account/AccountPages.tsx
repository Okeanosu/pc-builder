'use client';

import { BUILD_LABEL_TEXT, type BuildDTO, type OrderDTO, PURPOSE_LABELS, type Role } from '@pc/shared';
import { Cpu, Package, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AllocationBar } from '@/components/domain/AllocationBar';
import { PerfMeter } from '@/components/domain/PerfMeter';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Price } from '@/components/ui/Price';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/auth';
import { useAddBuildToCart } from '../cart/hooks';
import { Pagination } from '../catalog/Pagination';
import { ChangePasswordForm } from './ChangePasswordForm';
import { OrderStatusBadge, orderDate } from './OrderSummary';
import { useMyBuilds, useMyOrders } from './queries';

const ROLE_TEXT: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
};

function SectionTitle({ title, href, linkText }: { title: string; href?: string; linkText?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {href && (
        <Link
          href={href}
          className="focus-ring shrink-0 rounded-xs text-sm font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-current"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: OrderDTO }) {
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  return (
    <li className="group relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border py-3.5 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring">
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          href={`/orders/${order.code}`}
          className="text-sm font-semibold text-fg tabular-nums decoration-1 underline-offset-[3px] outline-none after:absolute after:inset-0 group-hover:underline"
        >
          {order.code}
        </Link>
        <span className="text-xs text-muted tabular-nums">
          {orderDate.format(new Date(order.createdAt))} · {count} sản phẩm
          {order.type === 'BUILD' && ' · lắp ráp nguyên bộ'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <OrderStatusBadge status={order.status} size="sm" />
        <Price amount={order.total} size="md" className="min-w-28 justify-end" />
        {order.status === 'PENDING_PAYMENT' && (
          <Button asChild size="sm" className="relative z-10">
            <Link href={`/orders/${order.code}/pay`}>Thanh toán</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

function ListSkeleton({ rows = 3, className = 'h-16' }: { rows?: number; className?: string }) {
  return (
    <div className="flex flex-col gap-2" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <Skeleton key={i} className={`${className} w-full`} />
      ))}
    </div>
  );
}

const noOrders = (
  <EmptyState
    compact
    icon={<Package />}
    title="Bạn chưa có đơn hàng nào"
    description="Đơn bạn đặt khi đã đăng nhập sẽ hiện ở đây, kèm tiến độ giao và lắp ráp."
    actions={
      <Button asChild>
        <Link href="/advisor">Hỏi AI tư vấn cấu hình</Link>
      </Button>
    }
  />
);

const loadError = (retry: () => void) => (
  <EmptyState
    tone="error"
    compact
    icon={<Package />}
    title="Chưa tải được dữ liệu"
    description="Máy chủ không phản hồi. Thử lại sau vài giây."
    actions={<Button onClick={retry}>Thử lại</Button>}
  />
);

export function AccountOverview() {
  const user = useAuthStore((s) => s.user);
  const orders = useMyOrders(1, 3);
  const builds = useMyBuilds();
  if (!user) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-16 w-full" />
        <ListSkeleton />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
            Xin chào, {user.fullName}
          </h1>
          <p className="text-sm text-muted">Quản lý đơn hàng và các cấu hình bạn đã lưu.</p>
        </div>
        <section
          aria-label="Hồ sơ"
          className="grid gap-x-8 gap-y-4 border-y border-border py-4 sm:grid-cols-3"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm text-muted">Email</span>
            <span className="truncate text-sm font-medium text-fg">{user.email}</span>
          </div>
          <div className="flex flex-col gap-0.5 sm:border-s sm:border-border sm:ps-8">
            <span className="text-sm text-muted">Số điện thoại</span>
            <span className="text-sm font-medium text-fg tabular-nums">{user.phone ?? 'Chưa có'}</span>
          </div>
          <div className="flex flex-col gap-0.5 sm:border-s sm:border-border sm:ps-8">
            <span className="text-sm text-muted">Vai trò</span>
            <span className="text-sm font-medium text-fg">{ROLE_TEXT[user.role]}</span>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-1" aria-label="Đơn hàng gần đây">
        <SectionTitle title="Đơn hàng gần đây" href="/account/orders" linkText="Tất cả đơn hàng" />
        {orders.isPending ? (
          <ListSkeleton />
        ) : orders.isError ? (
          loadError(() => void orders.refetch())
        ) : orders.data.items.length === 0 ? (
          noOrders
        ) : (
          <ul className="flex flex-col">
            {orders.data.items.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-5" aria-label="Cấu hình đã lưu">
        <SectionTitle title="Cấu hình đã lưu" href="/account/builds" linkText="Xem tất cả" />
        {builds.isPending ? (
          <ListSkeleton rows={2} className="h-40" />
        ) : builds.isError ? (
          loadError(() => void builds.refetch())
        ) : builds.data.length === 0 ? (
          <NoBuilds />
        ) : (
          <BuildGrid builds={builds.data.slice(0, 2)} />
        )}
      </section>

      <ChangePasswordForm />
    </div>
  );
}

export function MyOrders() {
  const page = Math.max(1, Math.floor(Number(useSearchParams().get('page'))) || 1);
  const orders = useMyOrders(page, 10);
  const totalPages = orders.data ? Math.max(1, Math.ceil(orders.data.total / orders.data.pageSize)) : 1;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
          Đơn hàng của tôi
        </h1>
        {orders.data && orders.data.total > 0 && (
          <p className="text-sm text-muted tabular-nums">{orders.data.total} đơn hàng</p>
        )}
      </div>
      {orders.isPending ? (
        <ListSkeleton rows={5} />
      ) : orders.isError ? (
        loadError(() => void orders.refetch())
      ) : orders.data.items.length === 0 ? (
        noOrders
      ) : (
        <>
          <ul className="flex flex-col border-t border-border" aria-busy={orders.isFetching || undefined}>
            {orders.data.items.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => `/account/orders?page=${p}`}
            onNavigate={(p) => {
              window.history.pushState(null, '', `/account/orders?page=${p}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}
    </div>
  );
}

function NoBuilds() {
  return (
    <EmptyState
      compact
      icon={<Cpu />}
      title="Chưa có cấu hình nào được lưu"
      description="Cấu hình AI đề xuất hoặc bạn tự lắp khi đã đăng nhập sẽ được lưu ở đây để mua sau."
      actions={
        <>
          <Button asChild>
            <Link href="/advisor">Hỏi AI tư vấn</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/builder">Tự lắp cấu hình</Link>
          </Button>
        </>
      }
    />
  );
}

function SavedBuildCard({ build }: { build: BuildDTO }) {
  const addBuild = useAddBuildToCart();
  return (
    <li className="flex min-w-0 flex-col gap-4 border-t border-fg pt-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        {build.label && <span className="font-medium text-fg">{BUILD_LABEL_TEXT[build.label]}</span>}
        <span className="text-muted">{PURPOSE_LABELS[build.purpose]}</span>
        <span className="ms-auto text-xs text-muted tabular-nums">
          {orderDate.format(new Date(build.createdAt))}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <Link
          href={`/builds/${build.id}`}
          className="focus-ring w-fit rounded-xs text-base font-semibold text-fg decoration-1 underline-offset-[3px] hover:underline"
        >
          {build.name}
        </Link>
        <Price amount={build.totalPrice} size="xl" />
      </div>
      <PerfMeter score={build.score} size="sm" label="Điểm hiệu năng" animate={false} />
      <AllocationBar
        allocation={build.allocation}
        total={build.totalPrice}
        size="sm"
        legend="compact"
        animate={false}
      />
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button asChild variant="outline" size="sm">
          <Link href={`/builds/${build.id}`}>Xem chi tiết</Link>
        </Button>
        <Button
          size="sm"
          loading={addBuild.isPending}
          onClick={() =>
            addBuild.mutate(build.id, {
              onSuccess: () => toast({ title: 'Đã thêm cả bộ vào giỏ hàng', tone: 'success' }),
            })
          }
        >
          {!addBuild.isPending && <ShoppingCart aria-hidden />}
          Mua cả bộ
        </Button>
      </div>
    </li>
  );
}

function BuildGrid({ builds }: { builds: BuildDTO[] }) {
  return (
    <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2">
      {builds.map((b) => (
        <SavedBuildCard key={b.id} build={b} />
      ))}
    </ul>
  );
}

export function MyBuilds() {
  const builds = useMyBuilds();
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
          Cấu hình đã lưu
        </h1>
        <p className="text-sm text-muted">Mở lại, chia sẻ liên kết hoặc mua cả bộ bất cứ lúc nào.</p>
      </div>
      {builds.isPending ? (
        <ListSkeleton rows={2} className="h-48" />
      ) : builds.isError ? (
        loadError(() => void builds.refetch())
      ) : builds.data.length === 0 ? (
        <NoBuilds />
      ) : (
        <BuildGrid builds={builds.data} />
      )}
    </div>
  );
}
