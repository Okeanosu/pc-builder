import { CATEGORY_KEYS, PURPOSES } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { byId, CATALOG, CPUS, GPUS, variant } from '../test/fixtures/catalog';
import { DEFAULT_PROFILES, profileForRequest } from './profiles';
import { cpuGpuTier, scoreProduct } from './scoring';

describe('scoreProduct', () => {
  it('gaming ranks RTX 4070 above RTX 4060', () => {
    expect(scoreProduct(byId('gpu-4070'), 'gaming', CATALOG)).toBeGreaterThan(
      scoreProduct(byId('gpu-4060'), 'gaming', CATALOG),
    );
  });

  it('ai ranks a 16GB-VRAM card above a faster 8GB card', () => {
    const vram16 = byId('gpu-4060ti-16');
    const fast8 = byId('gpu-3070ti');
    expect(fast8.benchmark?.gpuScore).toBeGreaterThan(vram16.benchmark?.gpuScore ?? 0);
    expect(scoreProduct(vram16, 'ai', CATALOG)).toBeGreaterThan(scoreProduct(fast8, 'ai', CATALOG));
  });

  it('graphics values multi-core more than gaming does', () => {
    const many = byId('cpu-i5-13400f');
    const fewFast = byId('cpu-i3-12100f');
    const gap = (purpose: 'gaming' | 'graphics') =>
      scoreProduct(many, purpose, CATALOG) - scoreProduct(fewFast, purpose, CATALOG);
    expect(gap('graphics')).toBeGreaterThan(gap('gaming'));
  });

  it('scores lie in 0..100 and the best product of each category scores 100', () => {
    for (const purpose of PURPOSES) {
      for (const category of CATEGORY_KEYS) {
        const scores = CATALOG.filter((p) => p.category === category).map((p) =>
          scoreProduct(p, purpose, CATALOG),
        );
        for (const s of scores) {
          expect(s).toBeGreaterThanOrEqual(0);
          expect(s).toBeLessThanOrEqual(100);
        }
        expect(Math.max(...scores)).toBeCloseTo(100, 9);
      }
    }
  });

  it('falls back to spec-derived performance when benchmark data is missing', () => {
    const bare = { ...byId('cpu-r5-7600'), id: 'cpu-bare', benchmark: undefined };
    const bareGpu = { ...byId('gpu-4060'), id: 'gpu-bare', benchmark: undefined };
    expect(scoreProduct(bare, 'gaming', CATALOG)).toBeGreaterThan(50);
    expect(scoreProduct(bareGpu, 'gaming', CATALOG)).toBeGreaterThan(30);
  });

  it('caps products outside the reference catalog at 100 and scores an empty category as 0..100', () => {
    const monster = variant('gpu-4070', { vramGB: 48 }, { id: 'gpu-x', benchmark: { gpuScore: 99_999 } });
    expect(scoreProduct(monster, 'gaming', CATALOG)).toBe(100);
    expect(scoreProduct(byId('psu-650-gold'), 'office', [])).toBe(100);
  });

  it('ranks mainboard, psu, case, cooler, storage and ram by their features', () => {
    expect(scoreProduct(byId('mb-z790'), 'gaming', CATALOG)).toBeGreaterThan(
      scoreProduct(byId('mb-h610m'), 'gaming', CATALOG),
    );
    expect(scoreProduct(byId('psu-750-gold'), 'gaming', CATALOG)).toBeGreaterThan(
      scoreProduct(byId('psu-450-bronze'), 'gaming', CATALOG),
    );
    expect(scoreProduct(byId('case-o11-white'), 'gaming', CATALOG)).toBeGreaterThan(
      scoreProduct(byId('case-itx-sfx'), 'gaming', CATALOG),
    );
    expect(scoreProduct(byId('cooler-aio-360-white'), 'gaming', CATALOG)).toBeGreaterThan(
      scoreProduct(byId('cooler-lowprofile'), 'gaming', CATALOG),
    );
    expect(scoreProduct(byId('ssd-nvme-2tb'), 'graphics', CATALOG)).toBeGreaterThan(
      scoreProduct(byId('ssd-sata-500'), 'graphics', CATALOG),
    );
    expect(scoreProduct(byId('ram-ddr5-64-4x'), 'ai', CATALOG)).toBeGreaterThan(
      scoreProduct(byId('ram-ddr5-32'), 'ai', CATALOG),
    );
  });

  it('grades chipsets and PSU efficiency labels', () => {
    const chipsets = ['X870E', 'B650', 'H610', 'A620'];
    const boards = chipsets.map((chipset, i) => variant('mb-b650m-white', { chipset }, { id: `mb-${i}` }));
    const labels = [
      '80 Plus Titanium',
      '80 Plus Platinum',
      '80 Plus Gold',
      '80 Plus Silver',
      '80 Plus Bronze',
      'Standard',
    ];
    const supplies = labels.map((efficiency, i) =>
      variant('psu-650-gold', { efficiency }, { id: `psu-${i}` }),
    );
    const reference = [...CATALOG, ...boards, ...supplies];
    const descending = (list: typeof boards) => {
      const scores = list.map((p) => scoreProduct(p, 'office', reference));
      for (let i = 1; i < scores.length; i++) expect(scores[i - 1]).toBeGreaterThan(scores[i] as number);
    };
    descending(boards);
    descending(supplies);
  });
});

describe('cpuGpuTier', () => {
  it('assigns quintiles within the category', () => {
    expect(cpuGpuTier(byId('cpu-i7-14700k'), CATALOG)).toBe(5);
    expect(cpuGpuTier(byId('cpu-r5-5600g'), CATALOG)).toBe(1);
    expect(cpuGpuTier(byId('gpu-3050'), CATALOG)).toBe(1);
    expect(cpuGpuTier(byId('gpu-4070s-oos'), CATALOG)).toBe(5);
  });

  it('is monotone in raw performance', () => {
    const sorted = [...GPUS].sort((a, b) => (a.benchmark?.gpuScore ?? 0) - (b.benchmark?.gpuScore ?? 0));
    const tiers = sorted.map((g) => cpuGpuTier(g, CATALOG));
    expect([...tiers].sort()).toEqual(tiers);
    expect(new Set(CPUS.map((c) => cpuGpuTier(c, CATALOG))).size).toBeGreaterThan(3);
  });

  it('handles non-cpu/gpu products and returns the neutral tier without a reference', () => {
    expect(cpuGpuTier(byId('ssd-nvme-2tb'), CATALOG)).toBe(5);
    expect(cpuGpuTier(byId('gpu-4070'), [])).toBe(3);
  });
});

describe('DEFAULT_PROFILES', () => {
  it('weights sum to 1 for every purpose', () => {
    for (const purpose of PURPOSES) {
      const sum = Object.values(DEFAULT_PROFILES[purpose].weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 9);
      expect(DEFAULT_PROFILES[purpose].purpose).toBe(purpose);
    }
  });

  it('uses the plan weights verbatim', () => {
    expect(DEFAULT_PROFILES.gaming.weights).toEqual({
      gpu: 0.42,
      cpu: 0.22,
      ram: 0.1,
      storage: 0.07,
      mainboard: 0.07,
      psu: 0.05,
      case: 0.04,
      cooler: 0.03,
    });
    expect(DEFAULT_PROFILES.ai.weights.gpu).toBe(0.48);
    expect(DEFAULT_PROFILES.graphics.weights.cpu).toBe(0.32);
  });

  it('office profile gives the gpu weight 0 and allocation max 0', () => {
    expect(DEFAULT_PROFILES.office.weights.gpu).toBe(0);
    expect(DEFAULT_PROFILES.office.allocation.gpu).toEqual({ min: 0, max: 0 });
  });

  it('allocation is weight ± 0.08 clamped to [0, 1]', () => {
    expect(DEFAULT_PROFILES.gaming.allocation.gpu).toEqual({ min: 0.34, max: 0.5 });
    expect(DEFAULT_PROFILES.gaming.allocation.cooler).toEqual({ min: 0, max: 0.11 });
  });
});

describe('profileForRequest', () => {
  it('returns the profile unchanged without a resolution preference', () => {
    expect(profileForRequest(DEFAULT_PROFILES.gaming, undefined)).toBe(DEFAULT_PROFILES.gaming);
    expect(profileForRequest(DEFAULT_PROFILES.gaming, { resolution: '1080p' })).toBe(DEFAULT_PROFILES.gaming);
  });

  it('shifts weight from cpu to gpu for 1440p and 4k gaming, keeping the sum at 1', () => {
    const qhd = profileForRequest(DEFAULT_PROFILES.gaming, { resolution: '1440p' });
    const uhd = profileForRequest(DEFAULT_PROFILES.gaming, { resolution: '4k' });
    expect(qhd.weights.gpu).toBeGreaterThan(DEFAULT_PROFILES.gaming.weights.gpu);
    expect(uhd.weights.gpu).toBeGreaterThan(qhd.weights.gpu);
    expect(uhd.weights.cpu).toBeLessThan(DEFAULT_PROFILES.gaming.weights.cpu);
    expect(Object.values(uhd.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(uhd.allocation.gpu.min).toBeGreaterThan(DEFAULT_PROFILES.gaming.allocation.gpu.min);
  });

  it('ignores resolution for non-gaming purposes', () => {
    expect(profileForRequest(DEFAULT_PROFILES.office, { resolution: '4k' })).toBe(DEFAULT_PROFILES.office);
  });
});
