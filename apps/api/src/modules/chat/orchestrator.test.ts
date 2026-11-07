import type { BuildDTO, ChatEvent } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { type LlmChunk, type LlmClient, type LlmMessage, LlmUnavailableError } from './llm/types';
import { MAX_TOOL_ROUNDS, runTurn } from './orchestrator';
import { SYSTEM_PROMPT } from './prompts';
import { TOOL_DECLARATIONS } from './tools/declarations';
import type { ChatTool, RecommendToolOutput, ToolRegistry, ToolResult } from './tools/types';

type Step = Array<LlmChunk | Error> | 'hang';

interface FakeLlm extends LlmClient {
  calls: Array<{ system: string; history: LlmMessage[]; toolNames: string[] }>;
}

function fakeLlm(script: Step[]): FakeLlm {
  const calls: FakeLlm['calls'] = [];
  return {
    calls,
    async *stream(input) {
      calls.push({
        system: input.system,
        history: structuredClone(input.history),
        toolNames: input.tools.map((t) => t.name),
      });
      const step = script[calls.length - 1];
      if (!step) throw new Error('script exhausted');
      if (step === 'hang') {
        await new Promise(() => {});
        return;
      }
      for (const item of step) {
        if (item instanceof Error) throw item;
        yield item;
      }
    },
  };
}

const text = (t: string): LlmChunk => ({ type: 'text', text: t });
const call = (
  name: string,
  args: Record<string, unknown> = {},
): Extract<LlmChunk, { type: 'functionCall' }> => ({
  type: 'functionCall',
  name,
  args,
});

const OUTPUT: RecommendToolOutput = {
  builds: [
    {
      id: 'b1',
      label: 'balanced',
      totalPrice: 24_850_000,
      score: 81,
      parts: [
        { category: 'cpu', name: 'AMD Ryzen 5 7600', price: 4_990_000 },
        { category: 'gpu', name: 'GeForce RTX 4060 Ti 8GB', price: 10_490_000 },
      ],
      allocation: { gpu: 0.42, cpu: 0.2, mainboard: 0.12 },
      warnings: ['Nguồn chỉ dư 15% công suất'],
    },
    {
      id: 'b2',
      label: 'budget',
      totalPrice: 21_300_000,
      score: 70,
      parts: [{ category: 'cpu', name: 'Intel Core i5-12400F', price: 2_990_000 }],
      allocation: { gpu: 0.4, cpu: 0.14 },
      warnings: [],
    },
  ],
};

const fakeBuild = (id: string) => ({ id }) as BuildDTO;

interface FakeTool extends ChatTool {
  calls: Array<Record<string, unknown>>;
}

function tool(
  name: string,
  result: ToolResult | (() => Promise<ToolResult>),
  label = `Đang chạy ${name}`,
): FakeTool {
  const calls: Array<Record<string, unknown>> = [];
  const decl = TOOL_DECLARATIONS.find((d) => d.name === name) ?? {
    name,
    description: name,
    parametersJsonSchema: { type: 'object' },
  };
  return {
    calls,
    decl,
    label,
    async run(args) {
      calls.push(args);
      return typeof result === 'function' ? result() : result;
    },
  };
}

function recommendTool(output: RecommendToolOutput = OUTPUT): FakeTool {
  const ids = output.builds.map((b) => b.id);
  return tool(
    'recommend_builds',
    {
      forModel: output as unknown as Record<string, unknown>,
      events: [{ type: 'builds', builds: ids.map(fakeBuild) }],
      buildIds: ids,
    },
    'Đang tìm cấu hình tối ưu',
  );
}

const registry = (...tools: ChatTool[]): ToolRegistry => new Map(tools.map((t) => [t.decl.name, t]));

function harness() {
  const events: ChatEvent[] = [];
  return {
    events,
    emit: (e: ChatEvent) => events.push(e),
    types: () => events.map((e) => e.type),
    tokens: () =>
      events
        .filter((e): e is Extract<ChatEvent, { type: 'token' }> => e.type === 'token')
        .map((e) => e.text)
        .join(''),
    done: () => events.find((e): e is Extract<ChatEvent, { type: 'done' }> => e.type === 'done'),
  };
}

const ctx = { sessionId: 's1', guestId: 'g1' };
const base = { sessionId: 's1', history: [] as LlmMessage[], ctx };

describe('runTurn — AI mode', () => {
  it('runs recommend_builds, forwards builds, streams the explanation and finishes in AI mode', async () => {
    const llm = fakeLlm([
      [call('recommend_builds', { budget: 25_000_000, purpose: 'gaming' })],
      [text('Đây là '), text('3 cấu hình phù hợp.')],
    ]);
    const rec = recommendTool();
    const h = harness();
    const res = await runTurn(
      { ...base, userText: 'chơi game 25 triệu', messageId: 'm1' },
      { llm, tools: registry(rec), emit: h.emit },
    );

    expect(h.types()).toEqual(['tool', 'builds', 'tool', 'token', 'token', 'done']);
    expect(h.events[0]).toEqual({
      type: 'tool',
      name: 'recommend_builds',
      status: 'start',
      label: 'Đang tìm cấu hình tối ưu',
    });
    expect(h.events[2]).toMatchObject({ type: 'tool', name: 'recommend_builds', status: 'end' });
    expect(h.done()).toEqual({ type: 'done', messageId: 'm1', mode: 'AI' });
    expect(res).toMatchObject({
      mode: 'AI',
      assistantText: 'Đây là 3 cấu hình phù hợp.',
      buildIds: ['b1', 'b2'],
      messageId: 'm1',
    });
    expect(rec.calls).toEqual([{ budget: 25_000_000, purpose: 'gaming' }]);
    expect(res.toolCalls).toHaveLength(1);
    expect(res.toolCalls[0]).toMatchObject({ name: 'recommend_builds', ok: true });
  });

  it('sends the system prompt, registered tool declarations and the user message to the model', async () => {
    const llm = fakeLlm([[text('Chào anh/chị!')]]);
    const history: LlmMessage[] = [
      { role: 'user', parts: [{ text: 'xin chào' }] },
      { role: 'model', parts: [{ text: 'Chào anh/chị' }] },
    ];
    await runTurn(
      { ...base, history, userText: 'tư vấn giúp em' },
      { llm, tools: registry(recommendTool()), emit: () => {} },
    );
    const first = llm.calls[0];
    expect(first?.system).toBe(SYSTEM_PROMPT);
    expect(first?.toolNames).toEqual(['recommend_builds']);
    expect(first?.history).toEqual([...history, { role: 'user', parts: [{ text: 'tư vấn giúp em' }] }]);
  });

  it('appends functionCall and functionResponse turns before calling the model again', async () => {
    const llm = fakeLlm([
      [
        text('Dạ, '),
        { ...call('recommend_builds', { budget: 25_000_000, purpose: 'gaming' }), thoughtSignature: 'sig' },
      ],
      [text('Xong.')],
    ]);
    await runTurn(
      { ...base, userText: 'chơi game 25tr' },
      { llm, tools: registry(recommendTool()), emit: () => {} },
    );
    const second = llm.calls[1]?.history ?? [];
    expect(second.slice(-2)).toEqual([
      {
        role: 'model',
        parts: [
          { text: 'Dạ, ' },
          {
            functionCall: { name: 'recommend_builds', args: { budget: 25_000_000, purpose: 'gaming' } },
            thoughtSignature: 'sig',
          },
        ],
      },
      {
        role: 'user',
        parts: [{ functionResponse: { name: 'recommend_builds', response: OUTPUT } }],
      },
    ]);
  });

  it(`stops after ${MAX_TOOL_ROUNDS} tool rounds with an apology`, async () => {
    const loop = () => [call('search_products', { category: 'gpu' })];
    const llm = fakeLlm([loop(), loop(), loop(), loop(), loop(), loop()]);
    const search = tool('search_products', { forModel: { items: [] } });
    const h = harness();
    const res = await runTurn(
      { ...base, userText: 'tìm card' },
      { llm, tools: registry(search), emit: h.emit },
    );

    expect(search.calls).toHaveLength(MAX_TOOL_ROUNDS);
    expect(llm.calls).toHaveLength(MAX_TOOL_ROUNDS + 1);
    expect(res.mode).toBe('AI');
    expect(res.assistantText).toMatch(/Xin lỗi/);
    expect(h.tokens()).toBe(res.assistantText);
    expect(h.done()?.mode).toBe('AI');
  });

  it('tells the model when a tool fails and keeps going', async () => {
    const broken = tool('get_product_details', async () => {
      throw new Error('db down');
    });
    const llm = fakeLlm([
      [call('get_product_details', { productId: 'p1' })],
      [text('Xin lỗi, chưa lấy được.')],
    ]);
    const h = harness();
    const res = await runTurn(
      { ...base, userText: 'chi tiết p1' },
      { llm, tools: registry(broken), emit: h.emit },
    );

    const response = llm.calls[1]?.history.at(-1)?.parts[0];
    expect(response).toMatchObject({
      functionResponse: { name: 'get_product_details', response: { error: 'TOOL_FAILED' } },
    });
    expect(JSON.stringify(response)).not.toContain('db down');
    expect(res.toolCalls[0]).toMatchObject({ ok: false, error: 'db down' });
    expect(h.types()).toEqual(['tool', 'tool', 'token', 'done']);
    expect(res.mode).toBe('AI');
  });

  it('answers unknown tool names with an error instead of crashing', async () => {
    const llm = fakeLlm([[call('hack_the_planet')], [text('Em chỉ tư vấn PC thôi ạ.')]]);
    const res = await runTurn({ ...base, userText: 'hi' }, { llm, tools: registry(), emit: () => {} });
    expect(llm.calls[1]?.history.at(-1)?.parts[0]).toMatchObject({
      functionResponse: { name: 'hack_the_planet', response: { error: 'UNKNOWN_TOOL' } },
    });
    expect(res.mode).toBe('AI');
  });

  it('returns the intent derived from the recommend_builds arguments', async () => {
    const llm = fakeLlm([
      [
        call('recommend_builds', {
          budget: 30_000_000,
          purpose: 'graphics',
          preferences: { color: 'white' },
        }),
      ],
      [text('Ok.')],
    ]);
    const res = await runTurn(
      { ...base, userText: 'làm đồ họa khoảng 30 củ, màu trắng' },
      { llm, tools: registry(recommendTool()), emit: () => {} },
    );
    expect(res.intent).toMatchObject({
      budget: 30_000_000,
      purpose: 'graphics',
      preferences: { color: 'white' },
    });
  });
});

describe('runTurn — fallback mode', () => {
  it('falls back without a key and recommends via the registry', async () => {
    const rec = recommendTool();
    const h = harness();
    const res = await runTurn(
      { ...base, userText: '25tr chơi game, thích AMD' },
      { tools: registry(rec), emit: h.emit },
    );

    expect(res.mode).toBe('FALLBACK');
    expect(res.fallbackReason).toBe('NO_KEY');
    expect(rec.calls).toEqual([{ budget: 25_000_000, purpose: 'gaming', preferences: { cpuBrand: 'AMD' } }]);
    expect(h.types().slice(0, 3)).toEqual(['tool', 'builds', 'tool']);
    expect(h.types().filter((t) => t === 'token').length).toBeGreaterThan(1);
    expect(h.types().at(-1)).toBe('done');
    expect(h.types()).not.toContain('error');
    expect(h.done()?.mode).toBe('FALLBACK');
    expect(h.tokens()).toBe(res.assistantText);
    expect(res.assistantText).toContain('Cân bằng');
    expect(res.assistantText).toContain('24.850.000₫');
    expect(res.assistantText).toContain('Card đồ họa (42%)');
    expect(res.assistantText).toContain('Nguồn chỉ dư 15% công suất');
    expect(res.buildIds).toEqual(['b1', 'b2']);
    expect(res.intent).toMatchObject({ budget: 25_000_000, purpose: 'gaming' });
  });

  it('falls back on 429 after a partial stream without duplicating the partial text', async () => {
    const llm = fakeLlm([[text('Dạ, em '), text('đang tìm '), new LlmUnavailableError('RATE_LIMIT')]]);
    const rec = recommendTool();
    const h = harness();
    const res = await runTurn(
      { ...base, userText: '25tr chơi game' },
      { llm, tools: registry(rec), emit: h.emit },
    );

    expect(h.types()).not.toContain('error');
    expect(h.done()?.mode).toBe('FALLBACK');
    expect(res.mode).toBe('FALLBACK');
    expect(res.fallbackReason).toBe('RATE_LIMIT');
    expect(h.tokens()).toBe(res.assistantText);
    expect(res.assistantText.startsWith('Dạ, em đang tìm ')).toBe(true);
    expect(res.assistantText.split('Dạ, em đang tìm').length - 1).toBe(1);
    expect(res.assistantText).toContain('24.850.000₫');
    expect(rec.calls).toHaveLength(1);
  });

  it('falls back when the model call times out', async () => {
    const llm = fakeLlm(['hang']);
    const h = harness();
    const res = await runTurn(
      { ...base, userText: '25tr chơi game' },
      { llm, tools: registry(recommendTool()), emit: h.emit, timeoutMs: 30 },
    );
    expect(res.mode).toBe('FALLBACK');
    expect(res.fallbackReason).toBe('TIMEOUT');
    expect(h.done()?.mode).toBe('FALLBACK');
  });

  it('treats unexpected model errors and empty answers as unavailable', async () => {
    const crash = await runTurn(
      { ...base, userText: '25tr chơi game' },
      { llm: fakeLlm([[new Error('socket hang up')]]), tools: registry(recommendTool()), emit: () => {} },
    );
    expect(crash).toMatchObject({ mode: 'FALLBACK', fallbackReason: 'UPSTREAM' });

    const empty = await runTurn(
      { ...base, userText: '25tr chơi game' },
      { llm: fakeLlm([[]]), tools: registry(recommendTool()), emit: () => {} },
    );
    expect(empty).toMatchObject({ mode: 'FALLBACK', fallbackReason: 'UPSTREAM' });
    expect(empty.assistantText).toContain('24.850.000₫');
  });

  it('reuses a recommendation already produced this turn instead of re-running the engine', async () => {
    const llm = fakeLlm([
      [call('recommend_builds', { budget: 25_000_000, purpose: 'gaming' })],
      [new LlmUnavailableError('RATE_LIMIT')],
    ]);
    const rec = recommendTool();
    const h = harness();
    const res = await runTurn(
      { ...base, userText: 'chơi game 25tr' },
      { llm, tools: registry(rec), emit: h.emit },
    );

    expect(rec.calls).toHaveLength(1);
    expect(h.types().filter((t) => t === 'builds')).toHaveLength(1);
    expect(res.mode).toBe('FALLBACK');
    expect(res.assistantText).toContain('24.850.000₫');
    expect(res.buildIds).toEqual(['b1', 'b2']);
  });

  it('explains an infeasible budget and suggests minFeasibleBudget in VND', async () => {
    const rec = recommendTool({
      builds: [],
      infeasibleReason: 'Không có tổ hợp linh kiện tương thích trong ngân sách',
      minFeasibleBudget: 12_500_000,
    });
    const res = await runTurn(
      { ...base, userText: 'chơi game 8 triệu' },
      { tools: registry(rec), emit: () => {} },
    );
    expect(res.mode).toBe('FALLBACK');
    expect(res.assistantText).toContain('12.500.000₫');
    expect(res.assistantText).toContain('Không có tổ hợp linh kiện tương thích');
    expect(res.buildIds).toEqual([]);
  });

  it('asks one question when the budget is missing and does not call the engine', async () => {
    const rec = recommendTool();
    const h = harness();
    const res = await runTurn(
      { ...base, userText: 'em muốn build máy chơi game' },
      { tools: registry(rec), emit: h.emit },
    );
    expect(rec.calls).toHaveLength(0);
    expect(res.assistantText).toMatch(/ngân sách/i);
    expect(res.assistantText.match(/\?/g)).toHaveLength(1);
    expect(res.intent).toMatchObject({ purpose: 'gaming' });
    expect(h.types()).not.toContain('tool');
  });

  it('asks for the purpose when only the budget is known', async () => {
    const res = await runTurn(
      { ...base, userText: 'tầm 20 triệu' },
      { tools: registry(recommendTool()), emit: () => {} },
    );
    expect(res.assistantText).toContain('20.000.000₫');
    expect(res.assistantText).toMatch(/chơi game/);
  });

  it('greets and asks for both when nothing is known', async () => {
    const res = await runTurn(
      { ...base, userText: 'xin chào' },
      { tools: registry(recommendTool()), emit: () => {} },
    );
    expect(res.assistantText).toMatch(/ngân sách/);
    expect(res.assistantText).toMatch(/mục đích/);
  });

  it('completes the request with the previous intent', async () => {
    const rec = recommendTool();
    const res = await runTurn(
      {
        ...base,
        userText: '25 triệu',
        previousIntent: { purpose: 'gaming', preferences: { color: 'white' } },
      },
      { tools: registry(rec), emit: () => {} },
    );
    expect(rec.calls).toEqual([{ budget: 25_000_000, purpose: 'gaming', preferences: { color: 'white' } }]);
    expect(res.intent).toMatchObject({ budget: 25_000_000, purpose: 'gaming' });
  });

  it('suggests switching to the other GPU brand in the follow-up hint', async () => {
    const res = await runTurn(
      {
        ...base,
        userText: 'đổi sang card AMD',
        previousIntent: { budget: 25_000_000, purpose: 'gaming', preferences: {} },
      },
      { tools: registry(recommendTool()), emit: () => {} },
    );
    expect(res.assistantText).toContain('Em đã đổi sang card AMD');
    expect(res.assistantText).toContain('"đổi card NVIDIA"');
  });

  it('applies "rẻ hơn" to the previous intent and says so', async () => {
    const rec = recommendTool();
    const res = await runTurn(
      {
        ...base,
        userText: 'rẻ hơn chút',
        previousIntent: { budget: 25_000_000, purpose: 'gaming', preferences: {} },
      },
      { tools: registry(rec), emit: () => {} },
    );
    expect(rec.calls[0]).toMatchObject({ budget: 22_500_000 });
    expect(res.assistantText).toContain('22.500.000₫');
  });

  it('passes resolution at the top level too, matching the tool declaration', async () => {
    const rec = recommendTool();
    await runTurn({ ...base, userText: 'chơi game 2K 30tr' }, { tools: registry(rec), emit: () => {} });
    expect(rec.calls[0]).toEqual({
      budget: 30_000_000,
      purpose: 'gaming',
      resolution: '1440p',
      preferences: { resolution: '1440p' },
    });
  });

  it('does not re-run the engine for small talk once the request is complete', async () => {
    const rec = recommendTool();
    const res = await runTurn(
      {
        ...base,
        userText: 'cảm ơn nhé',
        previousIntent: { budget: 25_000_000, purpose: 'gaming', preferences: {} },
      },
      { tools: registry(rec), emit: () => {} },
    );
    expect(rec.calls).toHaveLength(0);
    expect(res.assistantText).toMatch(/rẻ hơn/);
  });

  it('explains the minimum budget for tiny budgets', async () => {
    const rec = recommendTool();
    const res = await runTurn(
      { ...base, userText: 'chơi game 3 triệu' },
      { tools: registry(rec), emit: () => {} },
    );
    expect(rec.calls).toHaveLength(0);
    expect(res.assistantText).toContain('5.000.000₫');
  });

  it('apologises when the engine tool fails', async () => {
    const broken = tool('recommend_builds', async () => {
      throw new Error('engine exploded');
    });
    const h = harness();
    const res = await runTurn(
      { ...base, userText: '25tr chơi game' },
      { tools: registry(broken), emit: h.emit },
    );
    expect(res.mode).toBe('FALLBACK');
    expect(res.assistantText).toMatch(/Xin lỗi/);
    expect(res.assistantText).not.toContain('engine exploded');
    expect(h.done()?.mode).toBe('FALLBACK');
  });

  it('generates a message id when none is given', async () => {
    const h = harness();
    const res = await runTurn({ ...base, userText: 'xin chào' }, { tools: registry(), emit: h.emit });
    expect(res.messageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(h.done()?.messageId).toBe(res.messageId);
  });
});
