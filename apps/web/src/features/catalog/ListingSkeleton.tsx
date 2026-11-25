import { Skeleton } from '@/components/ui/Skeleton';
import { ProductGridSkeleton } from './ProductBrowser';

/** Static-shell placeholder for listing pages while the first page streams in. */
export function ListingSkeleton({ title }: { title?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-10" aria-busy>
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-1.5 border-b border-border pb-5">
        {title ? (
          <h1 className="text-2xl font-semibold font-stretch-expanded tracking-[-0.03em] text-fg sm:text-3xl">
            {title}
          </h1>
        ) : (
          <Skeleton className="h-10 w-56" />
        )}
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-10">
        <div className="hidden flex-col divide-y divide-border lg:flex">
          {Array.from({ length: 5 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
            <div key={i} className="flex flex-col gap-2.5 py-5 first:pt-0">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
