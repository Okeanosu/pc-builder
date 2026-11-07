import { describe, expect, it } from 'vitest';
import { type HistoryRow, toLlmHistory } from './chat.history';

const user = (content: string): HistoryRow => ({
  role: 'user',
  content,
  toolName: null,
  toolArgs: null,
  toolResult: null,
});
const assistant = (content: string): HistoryRow => ({ ...user(content), role: 'assistant' });
const tool = (name: string, args: unknown, result: unknown): HistoryRow => ({
  role: 'tool',
  content: '',
  toolName: name,
  toolArgs: args,
  toolResult: result,
});

describe('toLlmHistory', () => {
  it('rebuilds a turn as user text, functionCall, functionResponse and model text, in order', () => {
    const history = toLlmHistory([
      user('chơi game 25 triệu'),
      tool('recommend_builds', { budget: 25_000_000, purpose: 'gaming' }, { builds: [{ id: 'b1' }] }),
      assistant('Đây là 3 cấu hình.'),
      user('rẻ hơn chút'),
      tool('modify_build', { buildId: 'b1', budgetDelta: -2_000_000 }, { builds: [] }),
      tool('search_products', { category: 'gpu' }, { products: [] }),
      assistant('Em đã điều chỉnh.'),
    ]);
    expect(history).toEqual([
      { role: 'user', parts: [{ text: 'chơi game 25 triệu' }] },
      {
        role: 'model',
        parts: [
          { functionCall: { name: 'recommend_builds', args: { budget: 25_000_000, purpose: 'gaming' } } },
        ],
      },
      {
        role: 'user',
        parts: [{ functionResponse: { name: 'recommend_builds', response: { builds: [{ id: 'b1' }] } } }],
      },
      { role: 'model', parts: [{ text: 'Đây là 3 cấu hình.' }] },
      { role: 'user', parts: [{ text: 'rẻ hơn chút' }] },
      {
        role: 'model',
        parts: [{ functionCall: { name: 'modify_build', args: { buildId: 'b1', budgetDelta: -2_000_000 } } }],
      },
      { role: 'user', parts: [{ functionResponse: { name: 'modify_build', response: { builds: [] } } }] },
      { role: 'model', parts: [{ functionCall: { name: 'search_products', args: { category: 'gpu' } } }] },
      {
        role: 'user',
        parts: [{ functionResponse: { name: 'search_products', response: { products: [] } } }],
      },
      { role: 'model', parts: [{ text: 'Em đã điều chỉnh.' }] },
    ]);
  });

  it('starts at the first user message when the window cuts a turn in half', () => {
    const history = toLlmHistory([
      tool('recommend_builds', {}, { builds: [] }),
      assistant('Rất tiếc...'),
      user('30 triệu'),
      assistant('Dạ.'),
    ]);
    expect(history.map((m) => m.role)).toEqual(['user', 'model']);
    expect(history[0]).toEqual({ role: 'user', parts: [{ text: '30 triệu' }] });
  });

  it('skips empty replies and merges consecutive turns of the same role so roles alternate', () => {
    const history = toLlmHistory([user('chào'), assistant(''), user('chơi game'), assistant('Ngân sách ạ?')]);
    expect(history).toEqual([
      { role: 'user', parts: [{ text: 'chào' }, { text: 'chơi game' }] },
      { role: 'model', parts: [{ text: 'Ngân sách ạ?' }] },
    ]);
  });

  it('wraps non-object tool payloads so they are valid function arguments and responses', () => {
    const history = toLlmHistory([user('x'), tool('get_product_details', null, 'oops')]);
    expect(history.slice(1)).toEqual([
      { role: 'model', parts: [{ functionCall: { name: 'get_product_details', args: {} } }] },
      {
        role: 'user',
        parts: [{ functionResponse: { name: 'get_product_details', response: { result: 'oops' } } }],
      },
    ]);
  });

  it('returns an empty history for no rows', () => {
    expect(toLlmHistory([])).toEqual([]);
  });
});
