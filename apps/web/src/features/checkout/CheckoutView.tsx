'use client';

import type { CheckoutInput, OrderDTO } from '@pc/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LockKeyhole, PackageOpen, QrCode, TriangleAlert, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { CATEGORY_COLOR } from '@/components/domain/category';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Price } from '@/components/ui/Price';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';
import { apiErrorMessage } from '../auth/form-errors';
import { useBuilds, useCart } from '../cart/hooks';
import { cartAssemblyFee, groupCartLines, isBuildComplete } from '../cart/lines';
import { type CheckoutFormValues, validateCheckout } from './checkout-form';

type Errors = Partial<Record<keyof CheckoutFormValues, string>>;
const FIELD_ORDER: (keyof CheckoutFormValues)[] = ['shippingName', 'phone', 'address', 'note'];

export function CheckoutView() {
  const router = useRouter();
  const qc = useQueryClient();
  const buildId = useSearchParams().get('build');
  const user = useAuthStore((s) => s.user);
  const { data: cart, isPending, isError, refetch } = useCart();
  const { byId: builds } = useBuilds(buildId ? [buildId] : []);
  const [values, setValues] = useState<CheckoutFormValues>({
    shippingName: '',
    phone: '',
    address: '',
    note: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const prefilled = useRef(false);

  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    setValues((v) => ({
      ...v,
      shippingName: v.shippingName || user.fullName,
      phone: v.phone || (user.phone ?? ''),
    }));
  }, [user]);

  const placeOrder = useMutation({
    mutationFn: (input: CheckoutInput) => api<OrderDTO>('/orders', { method: 'POST', json: input }),
    onSuccess: (order) => {
      qc.setQueryData(queryKeys.order(order.code), order);
      void qc.invalidateQueries({ queryKey: queryKeys.cart });
      void qc.invalidateQueries({ queryKey: queryKeys.myOrders });
      router.push(`/orders/${order.code}/pay`);
    },
    onError: (error) => {
      toast({ title: 'Chưa đặt được hàng', description: apiErrorMessage(error), tone: 'error' });
      void qc.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });

  const grouped = groupCartLines(cart?.items ?? []);
  const buildGroup = buildId ? grouped.builds.find((g) => g.buildId === buildId) : undefined;
  const lines = buildId ? (buildGroup?.items ?? []) : (cart?.items ?? []);
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const assemblyFee = buildId ? cartAssemblyFee(cart) : 0;
  const build = buildId ? builds.get(buildId) : undefined;
  const incomplete = build && buildGroup ? !isBuildComplete(build, buildGroup) : false;

  const set = (key: keyof CheckoutFormValues) => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateCheckout(values, buildId);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((k) => result.errors[k]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    placeOrder.mutate(result.data);
  };

  if (isPending) {
    return (
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12" aria-busy>
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        tone="error"
        icon={<PackageOpen />}
        title="Chưa tải được giỏ hàng"
        description="Máy chủ không phản hồi. Thông tin bạn nhập chưa bị mất, hãy thử lại."
        actions={<Button onClick={() => void refetch()}>Thử lại</Button>}
      />
    );
  }
  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen />}
        title={buildId ? 'Cấu hình này không còn trong giỏ' : 'Giỏ hàng đang trống'}
        description={
          buildId
            ? 'Có thể bạn đã đặt hoặc xóa cấu hình. Quay lại giỏ để kiểm tra.'
            : 'Thêm sản phẩm vào giỏ trước khi thanh toán.'
        }
        actions={
          <Button asChild>
            <Link href={buildId ? '/cart' : '/'}>{buildId ? 'Về giỏ hàng' : 'Tiếp tục mua sắm'}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <form
      ref={formRef}
      method="post"
      onSubmit={submit}
      noValidate
      className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12"
    >
      <div className="flex min-w-0 flex-col gap-10">
        <section aria-labelledby="checkout-contact" className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <h2 id="checkout-contact" className="text-lg font-semibold text-fg">
              Thông tin người nhận
            </h2>
            {!user && (
              <p className="text-sm text-muted">
                Không cần tài khoản để đặt hàng.{' '}
                <Link
                  href={`/login?redirect=${encodeURIComponent(buildId ? `/checkout?build=${buildId}` : '/checkout')}`}
                  className="focus-ring rounded-xs font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-current"
                >
                  Đăng nhập
                </Link>{' '}
                để theo dõi đơn trong tài khoản.
              </p>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Họ và tên" required error={errors.shippingName}>
              <Input
                name="shippingName"
                autoComplete="name"
                value={values.shippingName}
                onChange={(e) => set('shippingName')(e.target.value)}
                maxLength={100}
              />
            </Field>
            <Field
              label="Số điện thoại"
              required
              error={errors.phone}
              hint="Shipper sẽ gọi số này khi giao hàng"
            >
              <Input
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="tabular-nums"
                value={values.phone}
                onChange={(e) => set('phone')(e.target.value)}
                maxLength={14}
                placeholder="0912345678"
              />
            </Field>
          </div>
          <Field label="Địa chỉ giao hàng" required error={errors.address}>
            <Input
              name="address"
              autoComplete="street-address"
              value={values.address}
              onChange={(e) => set('address')(e.target.value)}
              maxLength={300}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
            />
          </Field>
          <Field label="Ghi chú" error={errors.note} hint="Ví dụ: giao giờ hành chính, gọi trước khi đến">
            <Textarea
              name="note"
              value={values.note}
              onChange={(e) => set('note')(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </Field>
        </section>

        <section aria-labelledby="checkout-payment" className="flex flex-col gap-3">
          <h2 id="checkout-payment" className="border-b border-border pb-3 text-lg font-semibold text-fg">
            Thanh toán: chuyển khoản VietQR
          </h2>
          <div className="flex items-start gap-3">
            <QrCode className="mt-0.5 size-5 shrink-0 text-fg" aria-hidden />
            <p className="max-w-xl text-sm text-muted">
              Sau khi đặt, bạn nhận mã QR có sẵn số tiền và nội dung. Quét bằng app ngân hàng bất kỳ, đơn được
              xác nhận tự động. Hàng được giữ cho bạn trong 15 phút.
            </p>
          </div>
        </section>
      </div>

      <aside aria-label="Đơn hàng" className="flex flex-col gap-4 lg:sticky lg:top-32">
        <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
          <h2 className="text-lg font-semibold text-fg">Đơn hàng</h2>
          <Link
            href="/cart"
            className="focus-ring inline-flex items-center gap-1 rounded-xs text-sm font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-current"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Sửa giỏ
          </Link>
        </div>
        {buildId && (
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <Wrench className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0">Lắp ráp nguyên bộ{build ? `: ${build.name}` : ''}</span>
          </p>
        )}
        {incomplete && (
          <p className="flex items-start gap-2 text-sm text-warn-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Cấu hình trong giỏ đang thiếu linh kiện so với bản gốc. Kỹ thuật viên sẽ lắp theo đúng các linh
              kiện bên dưới.
            </span>
          </p>
        )}
        <ul className="flex max-h-80 flex-col overflow-y-auto pe-1">
          {lines.map((l) => (
            <li
              key={l.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border py-2 text-sm"
            >
              <span className="flex min-w-0 items-baseline gap-2 text-fg">
                <span
                  aria-hidden
                  className="size-2 shrink-0 translate-y-[-1px] rounded-[2px]"
                  style={{ backgroundColor: CATEGORY_COLOR[l.product.category] }}
                />
                <span className="min-w-0">
                  <span className="line-clamp-2">{l.product.name}</span>
                  <span className="text-xs text-muted tabular-nums">× {l.qty}</span>
                </span>
              </span>
              <Price amount={l.lineTotal} size="sm" className="font-normal" />
            </li>
          ))}
        </ul>
        <dl className="flex flex-col text-sm">
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="text-muted">Tạm tính</dt>
            <dd>
              <Price amount={subtotal} size="sm" />
            </dd>
          </div>
          {buildId && (
            <div className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="text-muted">Phí lắp ráp</dt>
              <dd>
                <Price amount={assemblyFee} size="sm" />
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 pt-1.5 pb-3">
            <dt className="text-muted">Phí vận chuyển</dt>
            <dd className="font-medium text-ok-ink">Miễn phí</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-fg pt-3">
            <dt className="font-medium text-fg">Tổng thanh toán</dt>
            <dd>
              <Price amount={subtotal + assemblyFee} size="xl" />
            </dd>
          </div>
        </dl>
        <Button type="submit" size="lg" loading={placeOrder.isPending}>
          {!placeOrder.isPending && <QrCode aria-hidden />}
          Đặt hàng và lấy mã QR
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <LockKeyhole className="size-3.5 shrink-0" aria-hidden />
          Giá được tính lại từ kho khi đặt. Chưa thanh toán thì đơn tự hủy sau 15 phút.
        </p>
      </aside>
    </form>
  );
}
