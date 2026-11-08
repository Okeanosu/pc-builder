import { Suspense } from 'react';
import {
  AdvisorHero,
  CategoryGrid,
  FeaturedGrid,
  FeaturedSection,
  FeaturedSkeleton,
} from '@/features/home/sections';

export default function HomePage() {
  return (
    <>
      <AdvisorHero />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-14 lg:px-6 lg:py-16">
        <CategoryGrid />
        <FeaturedSection>
          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedGrid />
          </Suspense>
        </FeaturedSection>
      </div>
    </>
  );
}
