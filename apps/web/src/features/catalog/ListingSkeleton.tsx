import { Skeleton } from '@/components/ui/Skeleton';
import { ProductGridSkeleton } from './ProductBrowser';

/** Static-shell placeholder for listing pages while the first page streams in. */
export function ListingSkeleton({ title }: { title?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 lg:px-6 lg:py-8" aria-busy>
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-col gap-2">
        {title ? (
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-fg">{title}</h1>
        ) : (
          <Skeleton className="h-8 w-56" />
        )}
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden flex-col gap-4 rounded-md border border-border bg-surface p-4 lg:flex">
          {Array.from({ length: 5 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list
            <div key={i} className="flex flex-col gap-2.5">
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
