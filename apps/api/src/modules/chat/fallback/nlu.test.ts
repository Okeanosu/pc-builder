import { MAX_BUDGET } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { type ParsedIntent, parseIntent } from './nlu';

const prev = (over: Partial<ParsedIntent> = {}): ParsedIntent => ({
  budget: 25_000_000,
  purpose: 'gaming',
  preferences: {},
  ...over,
});

describe('parseIntent — budget', () => {
  it.each([
    ['25tr chơi game', 25_000_000],
    ['dưới 30 củ', 30_000_000],
    ['hai mươi lăm triệu', 25_000_000],
    ['25 triệu', 25_000_000],
    ['ngân sách 25.000.000đ', 25_000_000],
    ['25,000,000 vnd', 25_000_000],
    ['tầm 25000000', 25_000_000],
    ['budget 25m', 25_000_000],
    ['25tr5 thôi', 25_500_000],
    ['15,5 triệu', 15_500_000],
    ['mười lăm triệu', 15_000_000],
    ['ba mươi triệu', 30_000_000],
    ['một trăm triệu', 100_000_000],
    ['hai lăm triệu', 25_000_000],
    ['tầm hai mươi triệu', 20_000_000],
    ['hai mươi triệu rưỡi', 20_500_000],
    ['18 triệu rưỡi', 18_500_000],
    ['tui có 16 triệu', 16_000_000],
    ['ngân sách 25', 25_000_000],
    ['khoảng 22 cu', 22_000_000],
    ['hai lam trieu', 25_000_000],
  ])('%s → %d', (text, budget) => {
    expect(parseIntent(text).budget).toBe(budget);
  });

  it('parses a range and uses the upper bound as budget', () => {
    const r = parseIntent('tầm 20-25 triệu');
    expect(r.budget).toBe(25_000_000);
    expect(r.budgetRange).toEqual([20_000_000, 25_000_000]);
  });

  it('parses "từ … đến …" ranges', () => {
    const r = parseIntent('từ 18 đến 22 triệu');
    expect(r.budget).toBe(22_000_000);
    expect(r.budgetRange).toEqual([18_000_000, 22_000_000]);
  });

  it('parses ranges with units on both sides', () => {
    expect(parseIntent('20tr - 25tr').budgetRange).toEqual([20_000_000, 25_000_000]);
  });

  it('caps absurd budgets at MAX_BUDGET', () => {
    expect(parseIntent('1 tỷ').budget).toBe(MAX_BUDGET);
  });

  it('does not read "2K" as money', () => {
    const r = parseIntent('chơi game 2K 30tr');
    expect(r.budget).toBe(30_000_000);
    expect(r.preferences.resolution).toBe('1440p');
  });

  it('does not read product model numbers or "Ti" as money', () => {
    expect(parseIntent('RTX 4060 Ti 25 triệu').budget).toBe(25_000_000);
    expect(parseIntent('i5 13400F với RTX 4070').budget).toBeUndefined();
    expect(parseIntent('ram 16gb 3200mhz, ổ 1tb').budget).toBeUndefined();
  });

  it('picks the largest amount when several are mentioned', () => {
    expect(parseIntent('tổng 25 triệu, card tầm 8 triệu').budget).toBe(25_000_000);
  });

  it('reads a bare number as millions when the previous turn lacked a budget', () => {
    expect(parseIntent('25', { purpose: 'gaming', preferences: {} }).budget).toBe(25_000_000);
  });

  it('keeps small budgets so the responder can explain the minimum', () => {
    expect(parseIntent('3 triệu').budget).toBe(3_000_000);
  });
});

describe('parseIntent — purpose', () => {
  it.each([
    ['25tr chơi game', 'gaming'],
    ['PC chơi Valorant, PUBG', 'gaming'],
    ['render blender, premiere', 'graphics'],
    ['dựng phim, edit video', 'graphics'],
    ['25 trieu lam do hoa, render', 'graphics'],
    ['train model AI, deep learning', 'ai'],
    ['lập trình, code web', 'ai'],
    ['làm kế toán, word excel', 'office'],
    ['máy cho con học online', 'office'],
    ['chơi Valorant + edit video nhẹ, tầm 25 triệu, thích màu trắng', 'gaming'],
  ])('%s → %s', (text, purpose) => {
    expect(parseIntent(text).purpose).toBe(purpose);
  });

  it('does not treat addressing the bot as "AI" as the AI purpose', () => {
    expect(parseIntent('AI ơi, tư vấn máy chơi game 20 triệu').purpose).toBe('gaming');
    expect(parseIntent('bạn là AI à?').purpose).toBeUndefined();
  });

  it('leaves purpose undefined for small talk', () => {
    const r = parseIntent('xin chào shop');
    expect(r.purpose).toBeUndefined();
    expect(r.budget).toBeUndefined();
    expect(r.preferences).toEqual({});
  });
});

describe('parseIntent — preferences', () => {
  it('attributes brands to CPU and GPU by context', () => {
    const r = parseIntent('thích AMD, card NVIDIA');
    expect(r.preferences.cpuBrand).toBe('AMD');
    expect(r.preferences.gpuBrand).toBe('NVIDIA');
  });

  it('reads "CPU Intel, card AMD"', () => {
    const r = parseIntent('CPU Intel, card AMD');
    expect(r.preferences.cpuBrand).toBe('Intel');
    expect(r.preferences.gpuBrand).toBe('AMD');
  });

  it('reads product families', () => {
    const r = parseIntent('Ryzen 7 với RTX 4070');
    expect(r.preferences.cpuBrand).toBe('AMD');
    expect(r.preferences.gpuBrand).toBe('NVIDIA');
    expect(parseIntent('i5 13400F').preferences.cpuBrand).toBe('Intel');
    expect(parseIntent('card RX 7800 XT').preferences.gpuBrand).toBe('AMD');
    expect(parseIntent('thích card Intel Arc').preferences.gpuBrand).toBe('Intel');
  });

  it('inverts a negated CPU brand', () => {
    expect(parseIntent('không thích Intel').preferences.cpuBrand).toBe('AMD');
  });

  it('reads the spec example "chơi game 2K, 25 triệu, thích AMD"', () => {
    const r = parseIntent('chơi game 2K, 25 triệu, thích AMD');
    expect(r).toMatchObject({
      budget: 25_000_000,
      purpose: 'gaming',
      preferences: { cpuBrand: 'AMD', resolution: '1440p' },
    });
  });

  it.each([
    ['chơi game 1080p', '1080p'],
    ['màn 4K', '4k'],
    ['chơi game QHD', '1440p'],
  ])('%s → resolution %s', (text, resolution) => {
    expect(parseIntent(text).preferences.resolution).toBe(resolution);
  });

  it('reads colours, with and without diacritics', () => {
    expect(parseIntent('case trắng').preferences.color).toBe('white');
    expect(parseIntent('build màu đen').preferences.color).toBe('black');
    expect(parseIntent('vo case trang').preferences.color).toBe('white');
  });

  it('ignores a negated colour and keeps the last stated one', () => {
    expect(parseIntent('không thích màu trắng').preferences.color).toBeUndefined();
    expect(parseIntent('case trắng, à thôi đen đi').preferences.color).toBe('black');
  });

  it('does not read a GPU model number as a resolution', () => {
    expect(parseIntent('card GTX 1080 cũ').preferences.resolution).toBeUndefined();
  });

  it('does not confuse "đến" with the colour black', () => {
    expect(parseIntent('từ 20 đến 25 triệu').preferences.color).toBeUndefined();
    expect(parseIntent('tu 20 den 25 trieu').preferences.color).toBeUndefined();
  });

  it('reads wifi needs including negation', () => {
    expect(parseIntent('main có wifi').preferences.needWifi).toBe(true);
    expect(parseIntent('không cần wifi').preferences.needWifi).toBe(false);
  });

  it('reads RAM and storage minimums', () => {
    expect(parseIntent('ram 32gb').preferences.minRamGB).toBe(32);
    expect(parseIntent('cần 64GB RAM').preferences.minRamGB).toBe(64);
    expect(parseIntent('ssd 1tb').preferences.minStorageGB).toBe(1000);
    expect(parseIntent('512gb ssd').preferences.minStorageGB).toBe(512);
  });

  it('reads form factors', () => {
    expect(parseIntent('case ITX').preferences.formFactor).toBe('ITX');
    expect(parseIntent('main mATX').preferences.formFactor).toBe('mATX');
  });

  it('reads discrete GPU needs', () => {
    expect(parseIntent('cần card rời').preferences.requireDiscreteGpu).toBe(true);
    expect(parseIntent('dùng card onboard thôi').preferences.requireDiscreteGpu).toBe(false);
  });
});

describe('parseIntent — follow-ups with a previous intent', () => {
  it('"rẻ hơn chút" → cheaper and lowers the budget about 10%', () => {
    const r = parseIntent('rẻ hơn chút', prev());
    expect(r.wantsChange).toBe('cheaper');
    expect(r.budget).toBe(22_500_000);
    expect(r.purpose).toBe('gaming');
  });

  it('"mạnh hơn" → stronger and raises the budget about 10%', () => {
    const r = parseIntent('mạnh hơn', prev({ budget: 20_000_000 }));
    expect(r.wantsChange).toBe('stronger');
    expect(r.budget).toBe(22_000_000);
  });

  it('"bớt 3 triệu" subtracts from the previous budget', () => {
    const r = parseIntent('bớt 3 triệu', prev());
    expect(r.wantsChange).toBe('cheaper');
    expect(r.budget).toBe(22_000_000);
  });

  it('"thêm 5 triệu" adds to the previous budget', () => {
    const r = parseIntent('thêm 5 triệu', prev());
    expect(r.wantsChange).toBe('stronger');
    expect(r.budget).toBe(30_000_000);
  });

  it('"giảm tầm 3 triệu" is still a delta', () => {
    expect(parseIntent('giảm tầm 3 triệu', prev()).budget).toBe(22_000_000);
  });

  it('"giảm còn 20 triệu" is an absolute target', () => {
    const r = parseIntent('giảm còn 20 triệu', prev());
    expect(r.budget).toBe(20_000_000);
    expect(r.wantsChange).toBe('cheaper');
  });

  it('"đổi sang card AMD" swaps the GPU brand', () => {
    const r = parseIntent('đổi sang card AMD', prev({ preferences: { gpuBrand: 'NVIDIA' } }));
    expect(r.wantsChange).toBe('swap-gpu-brand');
    expect(r.preferences.gpuBrand).toBe('AMD');
    expect(r.budget).toBe(25_000_000);
  });

  it('"đổi CPU" toggles the previous CPU brand', () => {
    const r = parseIntent('đổi CPU khác đi', prev({ preferences: { cpuBrand: 'AMD' } }));
    expect(r.wantsChange).toBe('swap-cpu-brand');
    expect(r.preferences.cpuBrand).toBe('Intel');
  });

  it('merges new preferences over the previous intent', () => {
    const r = parseIntent('thích màu trắng', prev({ preferences: { cpuBrand: 'AMD' } }));
    expect(r).toMatchObject({
      budget: 25_000_000,
      purpose: 'gaming',
      preferences: { cpuBrand: 'AMD', color: 'white' },
    });
    expect(r.wantsChange).toBeUndefined();
  });

  it('a new purpose overrides the previous one', () => {
    expect(parseIntent('thôi chuyển qua làm đồ họa', prev()).purpose).toBe('graphics');
  });

  it('a new absolute budget replaces the previous range', () => {
    const r = parseIntent('30 triệu', prev({ budgetRange: [20_000_000, 25_000_000] }));
    expect(r.budget).toBe(30_000_000);
    expect(r.budgetRange).toBeUndefined();
  });

  it('a truly bare number does not replace a previous budget', () => {
    expect(parseIntent('có 16', prev()).budget).toBe(25_000_000);
    expect(parseIntent('16', prev()).budget).toBe(25_000_000);
    expect(parseIntent('30', prev()).budget).toBe(25_000_000);
  });

  it.each(['ngân sách 30', 'budget 30', 'tầm 30', 'khoảng 30 thôi'])(
    'a cued unit-less "%s" replaces the previous budget as millions',
    (text) => {
      expect(parseIntent(text, prev()).budget).toBe(30_000_000);
    },
  );

  it('a cued unit-less number right after a component word is not a budget', () => {
    expect(parseIntent('ram tầm 16 thôi', prev()).budget).toBe(25_000_000);
  });

  it.each([
    ['mạnh hơn 30 triệu', 30_000_000, 'stronger'],
    ['tốt hơn 30 triệu', 30_000_000, 'stronger'],
    ['rẻ hơn 20 triệu', 20_000_000, 'cheaper'],
    ['rẻ hơn 3 triệu', 22_000_000, 'cheaper'],
    ['bớt 5 triệu', 20_000_000, 'cheaper'],
    ['thêm 30 triệu', 55_000_000, 'stronger'],
  ])('comparative vs verb with previous 25M: "%s" → %d', (text, budget, change) => {
    const r = parseIntent(text, prev());
    expect(r.budget).toBe(budget);
    expect(r.wantsChange).toBe(change);
  });

  it('every amount is absolute without a previous budget', () => {
    expect(parseIntent('mạnh hơn 30 triệu').budget).toBe(30_000_000);
    expect(parseIntent('rẻ hơn 20 triệu').budget).toBe(20_000_000);
    expect(parseIntent('bớt 3 triệu').budget).toBe(3_000_000);
  });

  it('"mạnh hơn bản trước 5 triệu" adds to the previous budget', () => {
    const r = parseIntent('mạnh hơn bản trước 5 triệu', prev());
    expect(r.budget).toBe(30_000_000);
    expect(r.wantsChange).toBe('stronger');
  });

  it('"rẻ hơn so với lúc nãy 2 triệu" subtracts from the previous budget', () => {
    const r = parseIntent('rẻ hơn so với lúc nãy 2 triệu', prev());
    expect(r.budget).toBe(23_000_000);
    expect(r.wantsChange).toBe('cheaper');
  });

  it('"mạnh hơn, tầm 30 triệu" is still an absolute target', () => {
    const r = parseIntent('mạnh hơn, tầm 30 triệu', prev());
    expect(r.budget).toBe(30_000_000);
    expect(r.wantsChange).toBe('stronger');
  });
});

describe('parseIntent — product model numbers and "cũ" are not money', () => {
  it.each([
    'chơi game với i5 13600K',
    'i7 14700K',
    'i5 12600KF',
    'ryzen 7 7800X3D',
    'dùng lại card 1080 cũ',
    'main B650M',
    'card 1080 cu',
  ])('%s → no budget', (text) => {
    expect(parseIntent(text).budget).toBeUndefined();
  });

  it('"đang có card 3060 cũ, chơi game 20 triệu" → 20 triệu', () => {
    const r = parseIntent('đang có card 3060 cũ, chơi game 20 triệu');
    expect(r.budget).toBe(20_000_000);
    expect(r.purpose).toBe('gaming');
  });

  it('"muốn dùng lại ram 16 cũ" keeps the previous budget', () => {
    expect(parseIntent('muốn dùng lại ram 16 cũ', prev()).budget).toBe(25_000_000);
    expect(parseIntent('muon dung lai ram 16 cu', prev()).budget).toBe(25_000_000);
  });

  it('"card RTX 4060 - 25 triệu" → budget 25 triệu, no range', () => {
    const r = parseIntent('card RTX 4060 - 25 triệu');
    expect(r.budget).toBe(25_000_000);
    expect(r.budgetRange).toBeUndefined();
  });

  it('mainboard model suffixes do not hide the real budget', () => {
    expect(parseIntent('main B650M, 25 triệu').budget).toBe(25_000_000);
  });

  it('still reads "củ" with diacritics and bare "cu" at the end of a clause', () => {
    expect(parseIntent('30 củ chơi game').budget).toBe(30_000_000);
    expect(parseIntent('tầm 20 cu, chơi game').budget).toBe(20_000_000);
  });

  it.each([
    ['25 cu choi game', 25_000_000],
    ['tầm 25 cu nhé', 25_000_000],
    ['25 cu thoi', 25_000_000],
    ['dùng lại card 1080 cu', undefined],
    ['ram 16 cu', undefined],
    ['tan nhiet 120 cu', undefined],
  ])('unaccented mid-sentence "cu": %s → %s', (text, budget) => {
    expect(parseIntent(text).budget).toBe(budget);
  });
});

describe('parseIntent — regression probes', () => {
  it.each([
    ['25tr', 25_000_000],
    ['25 củ', 25_000_000],
    ['tầm 20-25 triệu', 25_000_000],
    ['dưới 30 củ', 30_000_000],
    ['hai mươi lăm triệu', 25_000_000],
    ['chơi game 2K 30tr', 30_000_000],
    ['i5 13600K', undefined],
    ['card 3060 cũ, chơi game 20 triệu', 20_000_000],
  ])('%s → %s', (text, budget) => {
    expect(parseIntent(text).budget).toBe(budget);
  });

  it.each([
    ['mạnh hơn bản trước 5 triệu', 30_000_000],
    ['bớt 5 triệu', 20_000_000],
  ])('with previous 25M: %s → %d', (text, budget) => {
    expect(parseIntent(text, prev()).budget).toBe(budget);
  });
});
