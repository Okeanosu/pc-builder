/**
 * Probe for the intermittent "socket hang up" / ECONNRESET seen in supertest integration tests under load.
 * Sends N sequential requests per variant through supertest, in one process like a vitest worker:
 *
 *   per-request-keepalive   request(app): a fresh server per request, Node's default global agent (keep-alive)
 *   per-request-no-keepalive request(app) with http.globalAgent = new Agent({ keepAlive: false })
 *   shared-server           one server started by the probe, request(server), default agent (keep-alive)
 *
 * Usage from apps/api (uses and reseeds the E2E database by default; never point it at dev data):
 *   PROBE_N=300 PROBE_BURN=8 pnpm exec tsx test/perf/supertest-reset.probe.ts [login|health]
 * PROBE_BURN spawns that many busy-loop processes for the duration, to emulate a loaded machine.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.PROBE_DATABASE_URL ?? 'postgres://pc:pc@localhost:5433/pcbuilder_e2e';
process.env.REDIS_URL = process.env.PROBE_REDIS_URL ?? 'redis://localhost:6380/7';
process.env.GEMINI_API_KEY = '';
if (!/e2e|test/.test(process.env.DATABASE_URL))
  throw new Error('probe reseeds its database: use a throwaway one');

const N = Number(process.env.PROBE_N ?? 300);
const BURN = Number(process.env.PROBE_BURN ?? 0);
const target = process.argv[2] === 'health' ? 'health' : 'login';

const { createApp } = await import('../../src/app');
const { seedDatabase } = await import('../../src/db/seed');
const { createTestDeps } = await import('../helpers');

const t = createTestDeps();
await seedDatabase(t.deps.db);
const app = createApp(t.deps);

type Send = () => request.Test;
const send = (agent: ReturnType<typeof request>): Send =>
  target === 'login'
    ? () => agent.post('/api/auth/login').send({ email: 'khach@pcbuilder.vn', password: 'Khach@123' })
    : () => agent.get('/api/health');

async function run(name: string, make: () => Send) {
  const errors: Record<string, number> = {};
  const slowErrorsMs: number[] = [];
  let ok = 0;
  const started = Date.now();
  for (let i = 0; i < N; i++) {
    const t0 = Date.now();
    try {
      const res = await make()();
      if (res.status === 200) ok++;
      else errors[`HTTP ${res.status}`] = (errors[`HTTP ${res.status}`] ?? 0) + 1;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      const key = e.code ?? e.message;
      errors[key] = (errors[key] ?? 0) + 1;
      slowErrorsMs.push(Date.now() - t0);
    }
  }
  return {
    variant: name,
    target,
    n: N,
    ok,
    errors,
    errorAfterMs: slowErrorsMs,
    seconds: (Date.now() - started) / 1000,
  };
}

const burners = Array.from({ length: BURN }, () =>
  spawn(process.execPath, ['-e', 'for(;;){}'], { stdio: 'ignore' }),
);
const results = [];
const defaultAgent = http.globalAgent;
try {
  results.push(await run('per-request-keepalive', () => send(request(app))));
  http.globalAgent = new http.Agent({ keepAlive: false });
  results.push(await run('per-request-no-keepalive', () => send(request(app))));
  http.globalAgent = defaultAgent;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  results.push(await run('shared-server', () => send(request(url))));
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
} finally {
  for (const b of burners) b.kill();
  await t.close();
}
console.log(
  JSON.stringify(
    {
      node: process.version,
      keepAliveDefault: (defaultAgent as unknown as { keepAlive: boolean }).keepAlive,
      burn: BURN,
      results,
    },
    null,
    2,
  ),
);
