import { EventEmitter } from 'node:events';
import type { ChatEvent } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { type ChatTurnDeps, streamChatTurn, TURN_ERROR_MESSAGE, type TurnResponse } from './chat.controller';
import type { ChatSessionRow } from './chat.service';
import type { RunTurnDeps, RunTurnInput, RunTurnResult } from './orchestrator';

class FakeResponse extends EventEmitter implements TurnResponse {
  statusCode = 0;
  writableEnded = false;
  writableFinished = false;
  destroyed = false;
  chunks: string[] = [];
  setHeader() {}
  flushHeaders() {}
  write(chunk: string) {
    this.chunks.push(chunk);
    return true;
  }
  end() {
    this.writableEnded = true;
    this.writableFinished = true;
    this.emit('close');
  }
  events(): ChatEvent[] {
    return this.chunks.filter((c) => c.startsWith('data: ')).map((c) => JSON.parse(c.slice(6)) as ChatEvent);
  }
}

const session: ChatSessionRow = {
  id: 's1',
  userId: null,
  guestId: 'g1',
  title: null,
  mode: 'AI',
  createdAt: new Date(0),
};

function result(overrides: Partial<RunTurnResult> = {}): RunTurnResult {
  return {
    mode: 'AI',
    assistantText: 'Dạ.',
    buildIds: [],
    messageId: 'm1',
    toolCalls: [],
    intent: { preferences: {}, budget: 25_000_000 },
    ...overrides,
  };
}

function harness(
  runTurn: (input: RunTurnInput, deps: RunTurnDeps) => Promise<RunTurnResult>,
  chatOverrides: Partial<ChatTurnDeps['chat']> = {},
) {
  const log: Array<{ err: unknown; message: string }> = [];
  const saved: Array<{ result: RunTurnResult; latencyMs: number }> = [];
  const intents: unknown[] = [];
  const deps: ChatTurnDeps = {
    tools: new Map(),
    timeoutMs: 1000,
    runTurn,
    logError: (err, message) => log.push({ err, message }),
    chat: {
      loadHistory: async () => [],
      getIntent: async () => undefined,
      setIntent: async (_id, intent) => {
        intents.push(intent);
      },
      addUserMessage: async () => ({ id: 'u1', createdAt: new Date() }),
      saveTurn: async (_id, r, latencyMs) => {
        saved.push({ result: r, latencyMs });
      },
      ...chatOverrides,
    },
  };
  return { deps, log, saved, intents };
}

const input = { session, text: 'chơi game 25 triệu', who: { guestId: 'g1' } };

describe('streamChatTurn', () => {
  it('emits session first and sends done only after the turn is persisted', async () => {
    const res = new FakeResponse();
    const order: string[] = [];
    const h = harness(
      async (_input, d) => {
        d.emit({ type: 'token', text: 'Dạ.' });
        d.emit({ type: 'done', messageId: 'm1', mode: 'AI' });
        order.push(`events-before-save:${res.events().length}`);
        return result();
      },
      {
        saveTurn: async () => {
          order.push(
            `saved:${res
              .events()
              .map((e) => e.type)
              .join(',')}`,
          );
        },
      },
    );
    await streamChatTurn(input, res, h.deps);
    expect(res.events().map((e) => e.type)).toEqual(['session', 'token', 'done']);
    expect(order).toEqual(['events-before-save:2', 'saved:session,token']);
    expect(res.writableEnded).toBe(true);
    expect(h.intents).toEqual([{ preferences: {}, budget: 25_000_000 }]);
  });

  it('turns a non-LLM error into an error event followed by done, logs it and closes the stream', async () => {
    const res = new FakeResponse();
    const h = harness(async () => {
      throw new Error('bug in turn');
    });
    await streamChatTurn(input, res, h.deps);
    const events = res.events();
    expect(events.map((e) => e.type)).toEqual(['session', 'error', 'done']);
    expect(events[1]).toEqual({ type: 'error', code: 'INTERNAL', message: TURN_ERROR_MESSAGE });
    expect(events[2]).toMatchObject({ type: 'done', mode: 'FALLBACK' });
    expect(h.log).toHaveLength(1);
    expect(res.writableEnded).toBe(true);
  });

  it('reports a persistence failure after the reply as error then done', async () => {
    const res = new FakeResponse();
    const h = harness(
      async (_input, d) => {
        d.emit({ type: 'done', messageId: 'm1', mode: 'FALLBACK' });
        return result({ mode: 'FALLBACK' });
      },
      {
        saveTurn: async () => {
          throw new Error('db down');
        },
      },
    );
    await streamChatTurn(input, res, h.deps);
    expect(res.events().map((e) => e.type)).toEqual(['session', 'error', 'done']);
    expect(res.events()[2]).toEqual({ type: 'done', messageId: 'm1', mode: 'FALLBACK' });
    expect(h.log).toHaveLength(1);
  });

  it('aborts the turn signal when the client goes away mid-stream', async () => {
    const res = new FakeResponse();
    let signal: AbortSignal | undefined;
    const h = harness(async (_input, d) => {
      signal = d.signal;
      res.emit('close');
      return result({ cancelled: true });
    });
    await streamChatTurn(input, res, h.deps);
    expect(signal?.aborted).toBe(true);
    expect(h.saved).toHaveLength(1);
  });

  it('aborts at once when the client already left before the stream opened', async () => {
    const res = new FakeResponse();
    let abortedAtStart: boolean | undefined;
    const h = harness(
      async (_input, d) => {
        abortedAtStart = d.signal?.aborted;
        return result({ cancelled: true });
      },
      {
        addUserMessage: async () => {
          res.destroyed = true;
          res.emit('close');
          return { id: 'u1', createdAt: new Date() };
        },
      },
    );
    await streamChatTurn(input, res, h.deps);
    expect(abortedAtStart).toBe(true);
  });

  it('passes history, previous intent, owner context and the timeout to runTurn', async () => {
    const res = new FakeResponse();
    let seen: { input: RunTurnInput; deps: RunTurnDeps } | undefined;
    const h = harness(
      async (i, d) => {
        seen = { input: i, deps: d };
        return result();
      },
      {
        loadHistory: async () => [{ role: 'user', parts: [{ text: 'trước' }] }],
        getIntent: async () => ({ preferences: {}, purpose: 'gaming' }),
      },
    );
    await streamChatTurn({ ...input, who: { userId: 'u9', guestId: 'g1' } }, res, h.deps);
    expect(seen?.input).toMatchObject({
      sessionId: 's1',
      userText: 'chơi game 25 triệu',
      history: [{ role: 'user', parts: [{ text: 'trước' }] }],
      previousIntent: { purpose: 'gaming' },
      ctx: { sessionId: 's1', userId: 'u9', guestId: 'g1' },
    });
    expect(seen?.deps.timeoutMs).toBe(1000);
  });
});
