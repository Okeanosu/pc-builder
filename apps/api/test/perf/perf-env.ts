import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { createRedis } from '../../src/lib/redis';

export const API_URL = process.env.PERF_API_URL ?? 'http://localhost:4104/api';
export const REDIS_URL = process.env.PERF_REDIS_URL ?? 'redis://localhost:6380/7';

/** Nearest-rank percentile of raw samples (no histogram bucketing). */
export function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return Number.NaN;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1]!;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export async function assertApiUp(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(String(res.status));
  } catch (err) {
    console.error(
      `API not reachable at ${API_URL} (${String(err)}). Start it first, e.g. from apps/api:\n` +
        '  PORT=4104 NODE_ENV=development DATABASE_URL=postgres://pc:pc@localhost:5433/pcbuilder_e2e \\\n' +
        '  REDIS_URL=redis://localhost:6380/7 GEMINI_API_KEY= pnpm exec tsx ../../e2e/scripts/start-api.mts',
    );
    process.exit(1);
  }
}

/** Moves every catalog-derived cache key to a new version, so the next requests start cold. */
export async function bumpCatalogVersion(): Promise<number> {
  const redis = createRedis(REDIS_URL);
  try {
    return await redis.incr('catalog:version');
  } finally {
    await redis.quit();
  }
}

function tryExec(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'n/a';
  }
}

export function environment() {
  return {
    date: new Date().toISOString(),
    cpu: os.cpus()[0]?.model ?? 'n/a',
    cores: os.cpus().length,
    memoryGB: Math.round(os.totalmem() / 1024 ** 3),
    os: `${os.type()} ${os.release()}`,
    node: process.version,
    loadAvg1m: round1(os.loadavg()[0] ?? 0),
    postgres: tryExec('docker', ['exec', 'pcbuilder-postgres-1', 'postgres', '--version']),
    redis: tryExec('docker', ['exec', 'pcbuilder-redis-1', 'redis-server', '--version'])
      .split(' ')
      .slice(0, 3)
      .join(' '),
  };
}
