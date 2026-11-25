import { describe, expect, it } from 'vitest';
import type { LlmMessage } from './llm/types';
import { checkPriceMentions, extractVndAmounts, isKnownAmount, referenceAmounts } from './price-check';

const amounts = (text: string) => extractVndAmounts(text).map((m) => m.amount);

describe('extractVndAmounts', () => {
  it('reads grouped amounts with a currency mark, as the prompt asks the model to write them', () => {
    expect(amounts('Tổng 25.000.000₫, CPU 4.990.000 ₫.')).toEqual([25_000_000, 4_990_000]);
    expect(amounts('Phí lắp ráp 200.000đ, nguồn 1.250.000 đồng, RAM 2,190,000 VNĐ')).toEqual([
      200_000, 1_250_000, 2_190_000,
    ]);
    expect(amounts('còn dư 150.000 VND')).toEqual([150_000]);
  });

  it('reads grouped amounts of a million or more without a currency mark', () => {
    expect(amounts('Cấu hình này giá 24.850.000, rẻ hơn bản trước.')).toEqual([24_850_000]);
  });

  it('reads triệu / tr / tỷ / nghìn amounts, including decimals and ranges', () => {
    expect(amounts('Ngân sách 25 triệu')).toEqual([25_000_000]);
    expect(amounts('khoảng 25tr, hoặc 30 tr.')).toEqual([25_000_000, 30_000_000]);
    expect(amounts('chỉ 24,5 triệu; bản kia 21.3 triệu')).toEqual([24_500_000, 21_300_000]);
    expect(amounts('tầm 20-25 triệu hoặc 30 – 35 tr')).toEqual([
      20_000_000, 25_000_000, 30_000_000, 35_000_000,
    ]);
    expect(amounts('dàn 1,2 tỷ')).toEqual([1_200_000_000]);
    expect(amounts('chênh 500 nghìn')).toEqual([500_000]);
  });

  it('marks unit-word amounts as approximate and keeps the matched text', () => {
    expect(extractVndAmounts('giá 25 triệu và 24.850.000₫')).toEqual([
      { text: '25 triệu', amount: 25_000_000, approximate: true },
      { text: '24.850.000₫', amount: 24_850_000, approximate: false },
    ]);
  });

  it('ignores model numbers, specs and words that only start like a unit', () => {
    const text =
      'RTX 4060 Ti 8GB, Ryzen 5 7600, nguồn 750W, màn 2K 1440p, DDR5-6000, xung 5.4 GHz, 25 trong số đó, ' +
      'Cinebench 25.000 điểm, 3 cấu hình, 25 trước đây';
    expect(extractVndAmounts(text)).toEqual([]);
  });
});

describe('isKnownAmount', () => {
  const mention = (amount: number, approximate = false) => ({ text: '', amount, approximate });

  it('accepts exact amounts and amounts within ±1%', () => {
    expect(isKnownAmount(mention(24_850_000), [24_850_000])).toBe(true);
    expect(isKnownAmount(mention(25_000_000), [24_850_000])).toBe(true);
    expect(isKnownAmount(mention(26_000_000), [24_850_000])).toBe(false);
  });

  it('accepts a unit-word amount that rounds the known amount to the triệu', () => {
    expect(isKnownAmount(mention(24_000_000, true), [24_350_000])).toBe(true);
    expect(isKnownAmount(mention(25_000_000, true), [24_600_000])).toBe(true);
    expect(isKnownAmount(mention(25_000_000, true), [24_350_000])).toBe(false);
    expect(isKnownAmount(mention(24_000_000, false), [24_350_000])).toBe(false);
  });
});

describe('referenceAmounts', () => {
  const recommend = {
    args: { budget: 25_000_000, purpose: 'gaming' },
    response: {
      budget: 25_000_000,
      minFeasibleBudget: 9_500_000,
      note: 'Ngân sách 300.000.000 ₫ cao hơn mức tối đa, nên đã dùng 200.000.000 ₫.',
      builds: [
        {
          totalPrice: 24_000_000,
          allocation: { gpu: 0.4, cpu: 0.2 },
          parts: [{ category: 'cpu', name: 'AMD Ryzen 5 7600', price: 4_990_000 }],
        },
        { totalPrice: 21_000_000, allocation: { gpu: 0.5 }, parts: [] },
      ],
    },
  };

  it('collects prices, totals, budgets, minFeasibleBudget and amounts written in tool notes', () => {
    const known = referenceAmounts({ toolCalls: [recommend] });
    for (const n of [25_000_000, 9_500_000, 24_000_000, 21_000_000, 4_990_000, 300_000_000, 200_000_000]) {
      expect(known).toContain(n);
    }
  });

  it('derives allocation amounts, the money left in the budget and the gap between builds', () => {
    const known = referenceAmounts({ toolCalls: [recommend] });
    expect(known).toContain(9_600_000); // 40% of 24.000.000
    expect(known).toContain(10_500_000); // 50% of 21.000.000
    expect(known).toContain(1_000_000); // 25M budget - 24M total
    expect(known).toContain(3_000_000); // 24M - 21M
  });

  it('includes what the customer wrote and tool data already in the history, but not earlier model text', () => {
    const history: LlmMessage[] = [
      { role: 'user', parts: [{ text: 'tầm 18 triệu' }] },
      {
        role: 'model',
        parts: [{ functionCall: { name: 'search_products', args: { maxPrice: 7_000_000 } } }],
      },
      {
        role: 'user',
        parts: [
          { functionResponse: { name: 'search_products', response: { products: [{ price: 6_490_000 }] } } },
        ],
      },
      { role: 'model', parts: [{ text: 'Card này giá 99.000.000₫' }] },
    ];
    const known = referenceAmounts({ toolCalls: [], history, userText: 'còn 2,5 triệu thì sao' });
    expect(known).toEqual(expect.arrayContaining([18_000_000, 7_000_000, 6_490_000, 2_500_000]));
    expect(known).not.toContain(99_000_000);
  });
});

describe('checkPriceMentions', () => {
  it('counts mentions and lists the ones no tool returned, leaving the text untouched', () => {
    const text = 'Bộ này 24.000.000₫, phân bổ GPU khoảng 9,6 triệu; bản rẻ hơn chỉ 19.900.000₫.';
    const result = checkPriceMentions(text, [24_000_000, 9_600_000, 21_000_000]);
    expect(result).toEqual({ mentions: 3, unmatched: [{ text: '19.900.000₫', amount: 19_900_000 }] });
  });

  it('reports zero mentions for text without amounts', () => {
    expect(checkPriceMentions('Anh/chị dùng máy để làm gì ạ?', [])).toEqual({ mentions: 0, unmatched: [] });
  });
});
