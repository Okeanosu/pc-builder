import { PURPOSE_LABELS } from '@pc/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { BuildView } from '@/features/account/BuildView';
import { getBuild } from '@/features/catalog/server';
import { formatVnd } from '@/lib/format';

export async function generateMetadata({ params }: PageProps<'/builds/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const build = await getBuild(id).catch(() => null);
  if (!build) return { title: 'Không tìm thấy cấu hình' };
  const description = `Cấu hình PC ${PURPOSE_LABELS[build.purpose].toLowerCase()} ${build.items.length} linh kiện, tổng ${formatVnd(build.totalPrice)}, đã kiểm tra tương thích.`;
  return { title: build.name, description, openGraph: { title: build.name, description } };
}

async function BuildContent({ params }: Pick<PageProps<'/builds/[id]'>, 'params'>) {
  const { id } = await params;
  const build = await getBuild(id);
  if (!build) notFound();
  return <BuildView build={build} />;
}

function BuildSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 lg:px-6 lg:py-8" aria-busy>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-96 max-w-full" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-5 w-40" />
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
        <div className="flex flex-col gap-6">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function BuildPage({ params }: PageProps<'/builds/[id]'>) {
  return (
    <Suspense fallback={<BuildSkeleton />}>
      <BuildContent params={params} />
    </Suspense>
  );
}
