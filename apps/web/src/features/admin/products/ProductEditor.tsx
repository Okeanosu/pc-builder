'use client';

import { type AdminProductDTO, CATEGORY_KEYS, type CategoryDTO, type CategoryKey } from '@pc/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, EyeOff, PackageOpen, Save, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, use, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores/auth';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { ProductStatusBadge } from '../badges';
import { DynamicSpecForm } from '../DynamicSpecForm';
import { errorMessage, type FieldErrors, toFieldErrors } from '../errors';
import { formatDateTime, formatWeight } from '../format';
import { QueryError } from '../ui';
import { pickEnum } from '../use-list-params';
import { MoneyInput } from './MoneyInput';
import {
  BOOST_MAX,
  BOOST_MIN,
  buildProductPayload,
  emptyProductDraft,
  PRODUCT_FIELDS,
  type ProductDraft,
  productToDraft,
} from './product-form';
import { type SpecDraftValue, specPath, specsToDraft } from './spec-form';

const FORM_ID = 'product-form';

function useFocusFirstError(errors: FieldErrors, formError: string | null) {
  const ref = useRef<HTMLFormElement>(null);
  const count = Object.keys(errors).length;
  useEffect(() => {
    if (count === 0 && !formError) return;
    const el = ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [count, formError]);
  return ref;
}

function BoostSlider({
  value,
  onChange,
  error,
  readOnly,
}: {
  value: number;
  onChange: (v: number) => void;
  error?: string;
  readOnly?: boolean;
}) {
  const shown = Math.min(BOOST_MAX, Math.max(BOOST_MIN, value));
  return (
    <Field
      label="Hệ số ưu tiên thương mại"
      error={error}
      hint={`Cộng thêm ${formatNumber(Math.round(shown * 5 * 10) / 10)} điểm (thang 100) vào điểm chuẩn hóa khi bộ giải MCKP xếp hạng sản phẩm này. 0 = không ưu tiên, tối đa ${formatNumber(BOOST_MAX)}.`}
    >
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={BOOST_MIN}
          max={BOOST_MAX}
          step={0.01}
          value={shown}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={readOnly}
          className="h-10 min-w-0 flex-1 accent-ring"
          aria-valuetext={formatNumber(shown)}
        />
        <span className="w-12 text-end text-sm font-semibold text-fg tabular-nums">
          {formatWeight(shown)}
        </span>
      </div>
      {readOnly && <p className="text-xs text-muted">Chỉ quản trị viên chỉnh hệ số ưu tiên.</p>}
      {value < 0 && (
        <p className="text-xs text-warn-ink">
          Giá trị đang lưu là {formatNumber(value)} (bộ giải coi như 0). Chỉ thay đổi khi bạn kéo thanh trượt.
        </p>
      )}
    </Field>
  );
}

function HideProductPanel({ product }: { product: AdminProductDTO }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const refresh = (p: AdminProductDTO) => {
    qc.setQueryData(queryKeys.admin.product(p.id), p);
    void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.summary });
  };
  const hide = useMutation({
    mutationFn: () => adminApi.hideProduct(product.id),
    onSuccess: (p) => {
      refresh(p);
      setConfirming(false);
      toast({ title: 'Đã ẩn sản phẩm', description: p.name, tone: 'success' });
    },
    onError: (err) =>
      toast({ title: 'Không ẩn được sản phẩm', description: errorMessage(err), tone: 'error' }),
  });
  const show = useMutation({
    mutationFn: () => adminApi.updateProduct(product.id, { status: 'ACTIVE' }),
    onSuccess: (p) => {
      refresh(p);
      toast({ title: 'Sản phẩm đã hiện lại trên cửa hàng', description: p.name, tone: 'success' });
    },
    onError: (err) => toast({ title: 'Không hiện lại được', description: errorMessage(err), tone: 'error' }),
  });

  if (product.status === 'HIDDEN') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sản phẩm đang ẩn</CardTitle>
          <CardDescription>
            Khách không thấy sản phẩm này và AI không đưa nó vào cấu hình gợi ý. Đơn hàng cũ vẫn giữ nguyên.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={() => show.mutate()} loading={show.isPending}>
            Hiện lại trên cửa hàng
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={confirming ? 'border-danger/50' : undefined}>
      <CardHeader>
        <CardTitle>Ẩn sản phẩm</CardTitle>
        <CardDescription>
          Sản phẩm đã có trong đơn hàng và cấu hình nên không xóa hẳn; ẩn sẽ gỡ nó khỏi cửa hàng và khỏi bộ
          gợi ý.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {confirming ? (
          <div
            className="flex flex-col gap-3 rounded-sm border border-danger/40 bg-danger/8 p-3"
            role="alert"
          >
            <p className="text-sm text-fg">
              Ẩn <strong>{product.name}</strong>? Bạn có thể hiện lại bất cứ lúc nào.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" size="sm" onClick={() => hide.mutate()} loading={hide.isPending}>
                <EyeOff aria-hidden />
                Xác nhận ẩn
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={hide.isPending}
              >
                Không ẩn
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            <EyeOff aria-hidden />
            Ẩn khỏi cửa hàng
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface EditorFormProps {
  categories: CategoryDTO[];
  product?: AdminProductDTO;
  initialCategory?: CategoryKey;
}

function EditorForm({ categories, product, initialCategory }: EditorFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = Boolean(product);
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const startCategory =
    categories.find((c) => (product ? c.id === product.categoryId : c.key === initialCategory)) ??
    categories[0]!;
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product
      ? productToDraft(product, startCategory.specSchema)
      : emptyProductDraft(startCategory.id, startCategory.specSchema),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useFocusFirstError(errors, formError);

  const category = categories.find((c) => c.id === draft.categoryId) ?? startCategory;
  const fields = category.specSchema;
  const knownKeys = useMemo(() => [...PRODUCT_FIELDS, ...fields.map((f) => specPath(f.key))], [fields]);

  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };
  const setSpec = (key: string, value: SpecDraftValue) => {
    setDraft((d) => ({ ...d, specs: { ...d.specs, [key]: value } }));
    const path = specPath(key);
    if (errors[path]) setErrors(({ [path]: _, ...rest }) => rest);
  };
  const changeCategory = (id: string) => {
    const next = categories.find((c) => c.id === id);
    if (!next) return;
    setDraft((d) => ({ ...d, categoryId: id, specs: specsToDraft(next.specSchema, {}) }));
    setErrors({});
  };

  const save = useMutation({
    mutationFn: async () => {
      const { payload, errors: clientErrors } = buildProductPayload(draft, fields, product);
      if (!payload) {
        setErrors(clientErrors);
        setFormError('Kiểm tra các ô được đánh dấu đỏ.');
        return null;
      }
      if (payload.kind === 'patch' && Object.keys(payload.input).length === 0) {
        toast({ title: 'Không có thay đổi để lưu', tone: 'info' });
        return null;
      }
      return payload.kind === 'create'
        ? adminApi.createProduct(payload.input)
        : adminApi.updateProduct(product!.id, payload.input);
    },
    onSuccess: (saved) => {
      if (!saved) return;
      setErrors({});
      setFormError(null);
      qc.setQueryData(queryKeys.admin.product(saved.id), saved);
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.summary });
      toast({
        title: isEdit ? 'Đã lưu thay đổi' : 'Đã tạo sản phẩm',
        description: saved.name,
        tone: 'success',
      });
      // Editing remounts the form through its key (updatedAt changed), so only creation navigates.
      if (!isEdit) router.replace(`/admin/products/${saved.id}`);
    },
    onError: (err) => {
      const mapped = toFieldErrors(err, knownKeys);
      setErrors(mapped.fields);
      setFormError(
        mapped.form ??
          (err instanceof ApiError && err.status === 422
            ? 'Máy chủ từ chối một số giá trị, xem các ô đánh dấu đỏ.'
            : null),
      );
      toast({
        title: 'Chưa lưu được sản phẩm',
        description: mapped.form ?? 'Sửa các ô được đánh dấu rồi lưu lại.',
        tone: 'error',
      });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    save.mutate();
  };

  return (
    <>
      <AdminPageHeader
        title={isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        actions={
          <Button type="submit" form={FORM_ID} loading={save.isPending} size="sm">
            <Save aria-hidden />
            <span className="max-sm:sr-only">{isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</span>
          </Button>
        }
      />
      <form id={FORM_ID} ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="link" size="sm">
            <Link href="/admin/products">
              <ArrowLeft aria-hidden />
              Danh sách sản phẩm
            </Link>
          </Button>
          {product && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <ProductStatusBadge status={product.status} />
              <span>Cập nhật {formatDateTime(product.updatedAt)}</span>
              {product.status === 'ACTIVE' && (
                <Link
                  href={`/p/${product.slug}`}
                  target="_blank"
                  className="focus-ring inline-flex items-center gap-1 rounded-xs text-accent-ink hover:underline"
                >
                  Xem trên cửa hàng <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              )}
            </div>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger/8 px-4 py-3 text-sm text-danger-ink"
          >
            {formError}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin chung</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Danh mục"
                  required
                  error={errors.categoryId}
                  hint={isEdit ? 'Không đổi danh mục sau khi tạo vì bộ thông số khác nhau.' : undefined}
                >
                  <Select
                    value={draft.categoryId}
                    onValueChange={changeCategory}
                    disabled={isEdit}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  />
                </Field>
                <Field label="Hãng" required error={errors.brand} hint="Hãng mới sẽ được tạo tự động.">
                  <Input
                    value={draft.brand}
                    onChange={(e) => set('brand', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Tên sản phẩm" required error={errors.name} className="sm:col-span-2">
                  <Input
                    value={draft.name}
                    onChange={(e) => set('name', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field label="SKU" required error={errors.sku} hint="Chữ, số và dấu gạch ngang.">
                  <Input
                    mono
                    value={draft.sku}
                    onChange={(e) => set('sku', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field
                  label="Slug"
                  error={errors.slug}
                  hint={isEdit ? 'Đổi slug sẽ đổi đường dẫn sản phẩm.' : 'Để trống để tạo từ tên.'}
                >
                  <Input
                    mono
                    value={draft.slug}
                    onChange={(e) => set('slug', e.target.value)}
                    autoComplete="off"
                  />
                </Field>
                <Field label="Mô tả" error={errors.description} className="sm:col-span-2">
                  <Textarea
                    value={draft.description}
                    onChange={(e) => set('description', e.target.value)}
                    rows={4}
                  />
                </Field>
                <Field
                  label="Ảnh"
                  error={errors.images}
                  hint="Mỗi dòng một URL ảnh; để trống sẽ dùng bản vẽ kỹ thuật theo danh mục."
                  className="sm:col-span-2"
                >
                  <Textarea
                    value={draft.images}
                    onChange={(e) => set('images', e.target.value)}
                    rows={2}
                    className="tabular-nums text-xs"
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Thông số kỹ thuật · {category.name}</CardTitle>
                  <CardDescription>
                    Các ô sinh từ lược đồ thông số của danh mục (JSONB). Bộ luật tương thích đọc trực tiếp các
                    giá trị này.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/products/schema?category=${category.key}`}>
                    <Settings2 aria-hidden />
                    Lược đồ thông số
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <DynamicSpecForm fields={fields} value={draft.specs} onChange={setSpec} errors={errors} />
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Giá và tồn kho</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <Field label="Giá bán" required error={errors.price}>
                  <MoneyInput value={draft.price} onValueChange={(v) => set('price', v)} />
                </Field>
                <Field
                  label="Giá khuyến mãi"
                  error={errors.salePrice}
                  hint="Phải nhỏ hơn giá bán; để trống nếu không giảm giá."
                >
                  <MoneyInput value={draft.salePrice} onValueChange={(v) => set('salePrice', v)} />
                </Field>
                {isEdit && product ? (
                  <div className="flex flex-col gap-1.5 rounded-sm border border-border bg-surface-2 p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Trong kho</span>
                      <span className="tabular-nums">{product.stockOnHand}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted">Đang giữ cho đơn chờ thanh toán</span>
                      <span className="tabular-nums">{product.reserved}</span>
                    </div>
                    <div className="flex justify-between gap-2 font-medium">
                      <span>Có thể bán</span>
                      <span className="tabular-nums">{product.stock}</span>
                    </div>
                    <Link
                      href={`/admin/inventory?q=${encodeURIComponent(product.sku)}`}
                      className="focus-ring mt-1 w-fit rounded-xs text-xs font-medium text-accent-ink hover:underline"
                    >
                      Nhập hoặc điều chỉnh ở trang Tồn kho
                    </Link>
                  </div>
                ) : (
                  <Field
                    label="Tồn kho ban đầu"
                    error={errors.stock}
                    hint="Ghi thành một lần nhập kho; sau đó chỉ đổi qua trang Tồn kho."
                  >
                    <Input
                      mono
                      inputMode="numeric"
                      value={draft.stock === null ? '' : String(draft.stock)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        set('stock', digits ? Number(digits) : null);
                      }}
                    />
                  </Field>
                )}
                <Field label="Trạng thái" error={errors.status}>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => set('status', v as ProductDraft['status'])}
                    options={[
                      { value: 'ACTIVE', label: 'Đang bán' },
                      { value: 'HIDDEN', label: 'Ẩn khỏi cửa hàng' },
                    ]}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bộ máy gợi ý</CardTitle>
                <CardDescription>Ảnh hưởng thứ hạng sản phẩm trong cấu hình AI đề xuất.</CardDescription>
              </CardHeader>
              <CardContent>
                <BoostSlider
                  value={draft.commercialBoost}
                  onChange={(v) => set('commercialBoost', v)}
                  error={errors.commercialBoost}
                  readOnly={!isAdmin}
                />
              </CardContent>
            </Card>

            {product && <HideProductPanel product={product} />}
          </div>
        </div>
      </form>
    </>
  );
}

function EditorSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" aria-busy>
      <Skeleton className="h-[640px] rounded-md" />
      <Skeleton className="h-[420px] rounded-md" />
    </div>
  );
}

export function ProductEditor({
  productId,
  initialCategory,
}: {
  productId?: string;
  initialCategory?: CategoryKey;
}) {
  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: adminApi.categories,
    staleTime: 60_000,
  });
  const product = useQuery({
    queryKey: queryKeys.admin.product(productId ?? ''),
    queryFn: () => adminApi.product(productId!),
    enabled: Boolean(productId),
  });

  const title = productId ? 'Sửa sản phẩm' : 'Thêm sản phẩm';
  if (categories.isPending || (productId && product.isPending)) {
    return (
      <>
        <AdminPageHeader title={title} />
        <EditorSkeleton />
      </>
    );
  }
  if (productId && product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <>
        <AdminPageHeader title={title} />
        <Card>
          {notFound ? (
            <EmptyState
              icon={<PackageOpen />}
              title="Không tìm thấy sản phẩm"
              description="Sản phẩm có thể đã bị xóa khỏi dữ liệu hoặc đường dẫn bị sai."
              actions={
                <Button asChild variant="secondary">
                  <Link href="/admin/products">Về danh sách sản phẩm</Link>
                </Button>
              }
            />
          ) : (
            <QueryError error={product.error} onRetry={() => product.refetch()} compact={false} />
          )}
        </Card>
      </>
    );
  }
  if (categories.isError || !categories.data?.length) {
    return (
      <>
        <AdminPageHeader title={title} />
        <Card>
          <QueryError
            error={categories.error}
            onRetry={() => categories.refetch()}
            title="Không tải được danh mục"
          />
        </Card>
      </>
    );
  }
  return (
    <EditorForm
      // Remount when the server copy changes identity (another tab saved) so the draft starts fresh.
      key={product.data ? `${product.data.id}:${product.data.updatedAt}` : 'new'}
      categories={categories.data}
      product={product.data}
      initialCategory={initialCategory}
    />
  );
}

export function NewProductRoute() {
  const params = useSearchParams();
  return <ProductEditor initialCategory={pickEnum(params.get('category') ?? '', CATEGORY_KEYS)} />;
}

export function EditProductRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProductEditor productId={id} />;
}
