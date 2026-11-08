import { CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import { PackageOpen } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import { type ReactNode, Suspense } from 'react';
import { ProductCard } from '@/components/domain/ProductCard';
import { ProductImage } from '@/components/domain/ProductImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getFeaturedProducts } from '../catalog/server';
import { AdvisorPrompt } from './AdvisorPrompt';
import { SampleSheet } from './SampleSheet';
import { getSampleBuilds } from './server';

export function AdvisorHero() {
  return (
    <section aria-labelledby="home-title" className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-10 pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)] lg:gap-16 lg:px-6 lg:pt-16 lg:pb-20">
        <div className="flex min-w-0 flex-col gap-8">
          <h1
            id="home-title"
            className="text-[2.5rem] leading-[1.1] font-bold font-stretch-expanded tracking-[-0.04em] text-balance text-fg sm:text-4xl sm:leading-[1.08]"
          >
            Cấu hình đúng nhu cầu, đúng ngân sách.
          </h1>
          <p className="max-w-lg text-lg text-muted">
            Kể bằng tiếng Việt bạn cần máy để làm gì và có bao nhiêu tiền. Trợ lý chọn từ hàng đang có trong
            kho và kiểm tra tương thích từng cặp linh kiện.
          </p>
          <div className="flex max-w-xl flex-col gap-4">
            <AdvisorPrompt />
            <p className="ps-5 text-sm text-muted">
              Thích tự chọn?{' '}
              <Link
                href="/builder"
                className="focus-ring rounded-xs font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-current"
              >
                Lắp từng linh kiện
              </Link>
              , máy báo xung đột ngay khi bạn chọn.
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Suspense fallback={<SampleSheetSkeleton />}>
            <HeroSheet />
          </Suspense>
          <p className="text-xs text-muted">
            Linh kiện và giá lấy từ kho; AI chỉ giải thích, không tự đặt ra sản phẩm hay giá.
          </p>
        </div>
      </div>
    </section>
  );
}

async function HeroSheet() {
  await connection();
  const samples = await getSampleBuilds().catch(() => null);
  if (!samples?.length) {
    return (
      <p className="border-y border-border py-10 text-sm text-muted">
        Chưa lấy được cấu hình mẫu từ máy chủ. Bạn vẫn có thể kể nhu cầu ở bên trái để trợ lý chọn.
      </p>
    );
  }
  return <SampleSheet samples={samples} />;
}

function SampleSheetSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <div className="flex gap-5 border-b border-border pb-3">
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="flex flex-col">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
          <div key={i} className="flex items-center gap-4 border-b border-border py-2.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold font-stretch-expanded tracking-[-0.02em] text-fg">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function CategoryGrid() {
  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-5">
      <SectionHeading id="home-categories" title="Linh kiện" />
      <ul className="grid grid-cols-4 gap-x-3 gap-y-5 sm:gap-x-4 lg:grid-cols-8">
        {CATEGORY_KEYS.map((key) => (
          <li key={key}>
            <Link href={`/c/${key}`} className="focus-ring group flex flex-col gap-2 rounded-sm">
              <ProductImage alt="" category={key} className="aspect-square group-hover:bg-surface-3" />
              <span className="text-sm text-fg decoration-1 underline-offset-[3px] group-hover:underline">
                {CATEGORY_LABELS[key]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function FeaturedGrid() {
  await connection();
  const products = await getFeaturedProducts().catch(() => null);
  if (!products) {
    return (
      <EmptyState
        tone="error"
        compact
        icon={<PackageOpen />}
        title="Chưa tải được sản phẩm nổi bật"
        description="Máy chủ đang bận. Bạn vẫn có thể xem từng danh mục ở trên hoặc hỏi AI tư vấn."
      />
    );
  }
  if (products.length === 0) {
    return (
      <EmptyState
        compact
        icon={<PackageOpen />}
        title="Kho đang nhập hàng mới"
        description="Các sản phẩm nổi bật sẽ xuất hiện khi có hàng. Xem danh mục để đặt trước."
      />
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p) => (
        <li key={p.id} className="grid min-w-0">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

export function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeaturedSection({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="home-featured" className="flex flex-col gap-5">
      <SectionHeading
        id="home-featured"
        title="Mạnh nhất trong kho"
        action={
          <Link
            href="/search?inStock=true&sort=performance"
            className="focus-ring shrink-0 rounded-xs text-sm font-medium text-fg underline decoration-border-strong underline-offset-4 hover:decoration-current"
          >
            Xem tất cả
          </Link>
        }
      />
      {children}
    </section>
  );
}

export { FeaturedGrid };
