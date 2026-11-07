import { CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import { ArrowRight, Cpu, PackageOpen, QrCode, Scale, ShieldCheck, Wrench } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { CATEGORY_COLOR, CATEGORY_DESIGNATOR } from '@/components/domain/category';
import { ProductCard } from '@/components/domain/ProductCard';
import { ProductImage } from '@/components/domain/ProductImage';
import { WorkshopSurface } from '@/components/layout/WorkshopSurface';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getFeaturedProducts } from '../catalog/server';
import { AdvisorPrompt } from './AdvisorPrompt';

const STEPS = [
  { title: 'Kể nhu cầu bằng tiếng Việt', body: 'Game gì, làm đồ họa hay chạy AI, ngân sách bao nhiêu.' },
  {
    title: 'Engine chọn linh kiện trong kho',
    body: 'Kiểm tra tương thích từng cặp, chia ngân sách theo mục đích.',
  },
  {
    title: 'So sánh 3 cấu hình, mua cả bộ',
    body: 'Hiệu năng, cân bằng, tiết kiệm. Sửa tiếp bằng một câu chat.',
  },
];

export function AdvisorHero() {
  return (
    <WorkshopSurface className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-16 lg:px-6 lg:py-20">
        <div className="flex min-w-0 flex-col gap-6">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold tracking-wide text-accent-ink">
            <span
              aria-hidden
              className="size-1.5 animate-blink-dot rounded-full bg-accent shadow-(--led-shadow)"
            />
            AI TƯ VẤN CẤU HÌNH
          </p>
          <h1 className="max-w-2xl text-2xl font-extrabold tracking-[-0.02em] text-balance text-fg sm:text-3xl sm:tracking-[-0.03em]">
            Nói nhu cầu, AI chọn cấu hình từ hàng có sẵn
          </h1>
          <p className="max-w-xl text-base text-muted">
            Mọi linh kiện đều lấy từ kho thật, giá thật và đã qua kiểm tra tương thích. Không cần biết socket
            hay chuẩn RAM.
          </p>
          <AdvisorPrompt />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <Button asChild variant="outline">
              <Link href="/builder">
                <Wrench aria-hidden />
                Tự lắp cấu hình
              </Link>
            </Button>
            <span className="text-sm text-muted">
              Chọn từng linh kiện, máy báo xung đột ngay khi bạn chọn.
            </span>
          </div>
        </div>

        <ol
          className="grid gap-5 border-border max-lg:border-t max-lg:pt-8 lg:border-s lg:ps-8"
          aria-label="Cách AI tư vấn"
        >
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
              <span className="grid size-8 place-items-center rounded-sm border border-border-strong font-mono text-sm font-semibold text-accent-ink">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-fg">{s.title}</span>
                <span className="text-sm text-muted">{s.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </WorkshopSurface>
  );
}

function SectionHeading({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 id={id} className="text-xl font-bold tracking-[-0.01em] text-fg">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function CategoryGrid() {
  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-5">
      <h2 id="home-categories" className="text-xl font-bold tracking-[-0.01em] text-fg">
        Danh mục linh kiện
      </h2>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
        {CATEGORY_KEYS.map((key) => (
          <li key={key}>
            <Link
              href={`/c/${key}`}
              className="focus-ring group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-raised"
            >
              <ProductImage alt="" category={key} designator={false} className="rounded-none" />
              <span className="flex flex-col gap-0.5 px-2 py-2 sm:px-3 sm:py-2.5">
                <span className="text-xs font-semibold text-fg sm:text-sm">{CATEGORY_LABELS[key]}</span>
                <span className="flex items-center gap-1.5 font-mono text-xs text-muted max-sm:hidden">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLOR[key] }}
                  />
                  {CATEGORY_DESIGNATOR[key]}
                </span>
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
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id} className="grid">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

export function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
        <div key={i} className="flex flex-col overflow-hidden rounded-md border border-border bg-surface">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex flex-col gap-2.5 p-4">
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
        title="Sản phẩm nổi bật"
        action={
          <Link
            href="/search?inStock=true&sort=performance"
            className="focus-ring inline-flex items-center gap-1 rounded-xs text-sm font-semibold text-accent-ink hover:underline"
          >
            Xem thêm
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      {children}
    </section>
  );
}

export { FeaturedGrid };

const REASONS = [
  {
    icon: <ShieldCheck aria-hidden />,
    title: 'Bảo đảm tương thích',
    body: 'Mỗi cấu hình đi qua bộ luật kiểm tra C01–C15: socket CPU với mainboard, chuẩn RAM, công suất nguồn, chiều dài card đồ họa, chiều cao tản nhiệt. Có xung đột là máy báo ngay, kèm lý do.',
  },
  {
    icon: <Scale aria-hidden />,
    title: 'Tối ưu từng đồng ngân sách',
    body: 'Thuật toán chia tiền theo mục đích: chơi game dồn cho card đồ họa, dựng phim cân CPU và RAM, văn phòng ưu tiên bền và tiết kiệm. Không còn cảnh CPU mạnh đi với card yếu.',
  },
  {
    icon: <QrCode aria-hidden />,
    title: 'Thanh toán VietQR tự xác nhận',
    body: 'Quét mã bằng app ngân hàng bất kỳ. Đơn được xác nhận tự động trong vài giây, hàng được giữ cho bạn trong 15 phút chờ chuyển khoản.',
  },
];

export function WhyUs() {
  return (
    <section aria-labelledby="home-why" className="flex flex-col gap-5">
      <h2 id="home-why" className="text-xl font-bold tracking-[-0.01em] text-fg">
        Vì sao chọn chúng tôi
      </h2>
      <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
        {REASONS.map((r) => (
          <li key={r.title} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
            <span className="grid size-10 place-items-center rounded-sm bg-accent/12 text-accent-ink [&_svg]:size-5">
              {r.icon}
            </span>
            <h3 className="text-base font-semibold text-fg">{r.title}</h3>
            <p className="text-sm text-muted">{r.body}</p>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Cpu className="size-4 shrink-0 text-accent-ink" aria-hidden />
        Linh kiện và giá do hệ thống lấy từ kho; AI chỉ giải thích, không tự đặt ra sản phẩm hay giá.
      </p>
    </section>
  );
}
