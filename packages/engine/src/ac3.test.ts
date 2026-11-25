import type { CpuSpecs, GpuSpecs, MainboardSpecs } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { CATALOG, variant } from '../test/fixtures/catalog';
import { ac3 } from './ac3';
import { buildProblem, CPU, GPU, initialDomains, MAINBOARD, PSU } from './domains';
import { DEFAULT_PROFILES } from './profiles';
import type { EngineProduct, SolveRequest } from './types';

const gaming: SolveRequest = { budget: 40_000_000, purpose: 'gaming' };
const size = (domains: number[][]) => domains.reduce((n, d) => n + d.length, 0);

function onlyAm5Boards(): EngineProduct[] {
  return CATALOG.map((p) =>
    p.category === 'mainboard' && (p.specs as MainboardSpecs).socket !== 'AM5' ? { ...p, stock: 0 } : p,
  );
}

describe('ac3', () => {
  it('removes every LGA1700 / AM4 cpu when only AM5 boards are in stock', () => {
    const problem = buildProblem(gaming, onlyAm5Boards(), DEFAULT_PROFILES.gaming);
    const domains = initialDomains(problem);
    const before = size(domains);
    const result = ac3(problem, domains);

    expect(result.consistent).toBe(true);
    const sockets = domains[CPU]!.map((i) => (problem.items[CPU]![i]!.product!.specs as CpuSpecs).socket);
    expect(sockets.length).toBeGreaterThan(0);
    expect(sockets.every((s) => s === 'AM5')).toBe(true);
    expect(result.removed).toBe(before - size(domains));
    expect(result.removed).toBeGreaterThanOrEqual(6);
  });

  it('propagates transitively: DDR4 kits lose support once only AM5 (DDR5) boards remain', () => {
    const problem = buildProblem(gaming, onlyAm5Boards(), DEFAULT_PROFILES.gaming);
    const domains = initialDomains(problem);
    ac3(problem, domains);
    const ramIds = domains[2]!.map((i) => problem.items[2]![i]!.id);
    expect(ramIds.some((id) => id.startsWith('ram-ddr4'))).toBe(false);
  });

  it('reports a wipe-out when a variable loses all values', () => {
    const req: SolveRequest = { ...gaming, preferences: { cpuBrand: 'Intel' } };
    const problem = buildProblem(req, onlyAm5Boards(), DEFAULT_PROFILES.gaming);
    const domains = initialDomains(problem);
    expect(ac3(problem, domains).consistent).toBe(false);
    expect(domains[MAINBOARD]!.length === 0 || domains[CPU]!.length === 0).toBe(true);
  });

  it('enforces the ternary PSU constraint by bounds: a 290 W card is dropped when every PSU is 450 W', () => {
    const weakPsus = CATALOG.filter((p) => p.category !== 'psu' || p.id === 'psu-450-bronze');
    const problem = buildProblem(gaming, weakPsus, DEFAULT_PROFILES.gaming);
    const domains = initialDomains(problem);
    expect(ac3(problem, domains).consistent).toBe(true);
    const tgps = domains[GPU]!.map((i) => (problem.items[GPU]![i]!.product!.specs as GpuSpecs).tgpW);
    expect(tgps).not.toContain(290);
    expect(tgps).toContain(115);
  });

  it('drops high-TDP cpus and too-weak PSUs once a fixed 200 W card bounds the wattage', () => {
    const weak = variant('psu-450-bronze', { wattage: 400 }, { id: 'psu-400' });
    const catalog = [...CATALOG.filter((p) => p.category !== 'psu' || p.id === 'psu-450-bronze'), weak];
    const req: SolveRequest = { ...gaming, fixed: { gpu: 'gpu-4070' } };
    const problem = buildProblem(req, catalog, DEFAULT_PROFILES.gaming);
    const domains = initialDomains(problem);
    expect(ac3(problem, domains).consistent).toBe(true);
    const tdps = domains[CPU]!.map((i) => (problem.items[CPU]![i]!.product!.specs as CpuSpecs).tdpW);
    expect(Math.max(...tdps)).toBeLessThanOrEqual(65);
    expect(domains[PSU]!.map((i) => problem.items[PSU]![i]!.id)).toEqual(['psu-450-bronze']);
  });

  it('keeps the no-gpu value only for cpus with integrated graphics (office)', () => {
    const office: SolveRequest = { budget: 15_000_000, purpose: 'office', fixed: { cpu: 'cpu-r5-5600' } };
    const problem = buildProblem(office, CATALOG, DEFAULT_PROFILES.office);
    const domains = initialDomains(problem);
    expect(problem.items[GPU]![0]!.product).toBeNull();
    ac3(problem, domains);
    expect(domains[GPU]!.map((i) => problem.items[GPU]![i]!.product)).not.toContain(null);
  });
});
