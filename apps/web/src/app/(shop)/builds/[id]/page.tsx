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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8" aria-busy>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-80 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-8">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
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
