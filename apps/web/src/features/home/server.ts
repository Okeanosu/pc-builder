import type { BuildDTO, Purpose, RecommendationResultDTO } from '@pc/shared';
import { cacheLife } from 'next/cache';
import { API_URL } from '@/lib/api';

/** Server-to-server base URL; inside Docker the API is not reachable through the browser's hostname. */
const SERVER_API_URL = process.env.API_INTERNAL_URL ?? API_URL;

export interface SampleNeed {
  id: Purpose;
  /** Tab label on the home sheet. */
  label: string;
  /** What the advisor receives when the shopper opens this example. */
  prompt: string;
  purpose: Purpose;
  budget: number;
}

export const SAMPLE_NEEDS: SampleNeed[] = [
  {
    id: 'gaming',
    label: 'Chơi game 25tr',
    prompt: 'Chơi game tầm 25 triệu',
    purpose: 'gaming',
    budget: 25_000_000,
  },
  {
    id: 'graphics',
    label: 'Đồ họa 40tr',
    prompt: 'Làm đồ họa, dựng phim 40 triệu',
    purpose: 'graphics',
    budget: 40_000_000,
  },
  {
    id: 'ai',
    label: 'Chạy AI 60tr',
    prompt: 'Máy chạy AI, deep learning 60 triệu',
    purpose: 'ai',
    budget: 60_000_000,
  },
  {
    id: 'office',
    label: 'Văn phòng 12tr',
    prompt: 'Máy văn phòng, học tập 12 triệu',
    purpose: 'office',
    budget: 12_000_000,
  },
];

export interface SampleBuild {
  need: SampleNeed;
  build: BuildDTO;
  stats: RecommendationResultDTO['stats'];
}

async function recommend(need: SampleNeed): Promise<SampleBuild | null> {
  const res = await fetch(`${SERVER_API_URL}/recommendations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ budget: need.budget, purpose: need.purpose }),
  });
  if (!res.ok) throw new Error(`API ${res.status} on POST /recommendations`);
  const data = (await res.json()) as RecommendationResultDTO;
  // The performance pick spends closest to the budget, which is what the headline promises.
  const build = data.builds.find((b) => b.label === 'performance') ?? data.builds[0];
  return build ? { need, build, stats: data.stats } : null;
}

/**
 * Real engine output for the home page's example needs. Identical requests are cached by the API
 * as well, so this costs four cache hits per refresh. Throws when the API is down so nothing is cached.
 */
export async function getSampleBuilds(): Promise<SampleBuild[]> {
  'use cache';
  cacheLife('minutes');
  const results = await Promise.all(SAMPLE_NEEDS.map(recommend));
  return results.filter((r): r is SampleBuild => r !== null);
}
