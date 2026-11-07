import { Suspense } from 'react';
import {
  AdvisorHero,
  CategoryGrid,
  FeaturedGrid,
  FeaturedSection,
  FeaturedSkeleton,
  WhyUs,
} from '@/features/home/sections';

export default function HomePage() {
  return (
    <>
      <AdvisorHero />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-12 lg:px-6">
        <CategoryGrid />
        <FeaturedSection>
          <Suspense fallback={<FeaturedSkeleton />}>
            <FeaturedGrid />
          </Suspense>
        </FeaturedSection>
        <WhyUs />
      </div>
    </>
  );
}
