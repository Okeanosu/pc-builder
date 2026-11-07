// @vitest-environment jsdom
import type { BuildDTO, ChatEvent, ChatSessionDTO } from '@pc/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatStreamError } from '@/features/advisor/sse';
import type { ChatTransport } from '@/features/advisor/transport';
import { ApiError } from '@/lib/api';
import { useAuthStore } from './auth';
import {
  type AssistantMessage,
  applyChatEvent,
  attachChatView,
  CHAT_SESSION_KEY,
  doneLabel,
  historyToMessages,
  latestBuilds,
  setChatTransport,
  useChatStore,
} from './chat';

const build = (id: string, label: BuildDTO['label']): BuildDTO => ({
  id,
  name: id,
  label,
  purpose: 'gaming',
  budget: 25_000_000,
  source: 'CHAT',
  items: [],
  totalPrice: 24_000_000,
  score: 80,
  scoreBreakdown: {},
  allocation: { gpu: 0.4, cpu: 0.2 },
  estimatedWattage: 400,
  recommendedPsuWattage: 550,
  warnings: [],
  createdAt: '2026-11-07T00:00:00.000Z',
});

const session = (id: string, messages: ChatSessionDTO['messages'] = []): ChatSessionDTO => ({
  id,
  title: null,
  mode: 'FALLBACK',
  messages,
  createdAt: '2026-11-07T00:00:00.000Z',
});

const REPLY: ChatEvent[] = [
  { type: 'tool', name: 'recommend_builds', status: 'start', label: 'Đang chọn linh kiện trong kho…' },
  {
    type: 'builds',
    builds: [build('b1', 'performance'), build('b2', 'balanced'), build('b3', 'budget')],
  },
  { type: 'tool', name: 'recommend_builds', status: 'end', label: 'Đang chọn linh kiện trong kho…' },
  { type: 'token', text: 'Đây là 3 cấu hình ' },
  { type: 'token', text: 'phù hợp.' },
  { type: 'done', messageId: 'srv-1', mode: 'FALLBACK' },
];

function fakeTransport(overrides: Partial<ChatTransport> = {}): ChatTransport {
  return {
    createSession: vi.fn(async () => session('new-session')),
    getSession: vi.fn(async (id: string) => session(id)),
    sendMessage: vi.fn(async (_sid, _text, { onEvent }) => {
      for (const e of REPLY) onEvent(e);
    }),
    ...overrides,
  };
}

const assistant = (): AssistantMessage => ({
  id: 'a1',
  role: 'assistant',
  text: '',
  builds: [],
  products: [],
  tools: [],
  streaming: true,
  mode: null,
  error: null,
  stopped: false,
});

beforeEach(() => {
  localStorage.clear();
  useChatStore.getState().reset();
  useChatStore.setState({ historyStatus: 'idle' });
  useAuthStore.setState({ status: 'ready', user: null });
});

describe('applyChatEvent', () => {
  it('turns tool start/end into a running then done chip', () => {
    let m = applyChatEvent(assistant(), REPLY[0]!);
    expect(m.tools).toEqual([
      expect.objectContaining({
        name: 'recommend_builds',
        status: 'running',
        label: 'Đang chọn linh kiện trong kho…',
      }),
    ]);
    m = applyChatEvent(m, REPLY[2]!);
    expect(m.tools[0]?.status).toBe('done');
  });

  it('appends tokens, attaches builds and closes on done', () => {
    const m = REPLY.reduce(applyChatEvent, assistant());
    expect(m.text).toBe('Đây là 3 cấu hình phù hợp.');
    expect(m.builds.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
    expect(m.streaming).toBe(false);
    expect(m.mode).toBe('FALLBACK');
  });

  it('keeps an error event on the message', () => {
    const m = applyChatEvent(assistant(), { type: 'error', code: 'X', message: 'Lỗi công cụ' });
    expect(m.error).toBe('Lỗi công cụ');
  });
});

describe('doneLabel', () => {
  it('rewrites a progress label into a finished one', () => {
    expect(doneLabel('Đang chọn linh kiện trong kho…')).toBe('Đã chọn linh kiện trong kho');
    expect(doneLabel('Đang kiểm tra tương thích...')).toBe('Đã kiểm tra tương thích');
    expect(doneLabel('Tra cứu thông số')).toBe('Tra cứu thông số');
  });
});

describe('historyToMessages', () => {
  it('folds tool rows into the following assistant message', () => {
    const items = historyToMessages(
      session('s', [
        { id: 'u', role: 'user', content: 'game 25tr', toolName: null, builds: [], createdAt: '' },
        { id: 't', role: 'tool', content: '{}', toolName: 'recommend_builds', builds: [], createdAt: '' },
        {
          id: 'a',
          role: 'assistant',
          content: 'Gợi ý',
          toolName: null,
          builds: [build('b1', 'balanced')],
          createdAt: '',
        },
      ]),
    );
    expect(items).toHaveLength(2);
    const a = items[1] as AssistantMessage;
    expect(a.role).toBe('assistant');
    expect(a.tools).toEqual([expect.objectContaining({ name: 'recommend_builds', status: 'done' })]);
    expect(a.builds).toHaveLength(1);
    expect(a.streaming).toBe(false);
  });
});

describe('useChatStore', () => {
  it('creates a session lazily on first send and persists its id', async () => {
    const transport = fakeTransport();
    setChatTransport(transport);
    await useChatStore.getState().send('chơi game 25 triệu');
    expect(transport.createSession).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CHAT_SESSION_KEY)).toBe('new-session');
    const { messages, status, selectedBuildId } = useChatStore.getState();
    expect(status).toBe('idle');
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect((messages[1] as AssistantMessage).text).toBe('Đây là 3 cấu hình phù hợp.');
    expect(selectedBuildId).toBe('b2');
    expect(latestBuilds(messages).map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
  });

  it('loads history for a stored session on init', async () => {
    localStorage.setItem(CHAT_SESSION_KEY, 'old');
    const transport = fakeTransport({
      getSession: vi.fn(async (id: string) =>
        session(id, [
          { id: 'u', role: 'user', content: 'xin chào', toolName: null, builds: [], createdAt: '' },
        ]),
      ),
    });
    setChatTransport(transport);
    await useChatStore.getState().init();
    expect(transport.getSession).toHaveBeenCalledWith('old');
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().sessionId).toBe('old');
  });

  it('drops a stored session that answers 404', async () => {
    localStorage.setItem(CHAT_SESSION_KEY, 'gone');
    setChatTransport(
      fakeTransport({
        getSession: vi.fn(async () => {
          throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy');
        }),
      }),
    );
    await useChatStore.getState().init();
    expect(useChatStore.getState().sessionId).toBeNull();
    expect(localStorage.getItem(CHAT_SESSION_KEY)).toBeNull();
  });

  it('starts a new session and resends once when the stored one is gone mid-send', async () => {
    useChatStore.setState({ sessionId: 'stale' });
    let calls = 0;
    const transport = fakeTransport({
      sendMessage: vi.fn(async (sid: string, _t: string, { onEvent }) => {
        calls += 1;
        if (sid === 'stale') throw new ChatStreamError('SESSION_NOT_FOUND', 'gone', 404);
        for (const e of REPLY) onEvent(e);
      }),
    });
    setChatTransport(transport);
    await useChatStore.getState().send('hi');
    expect(calls).toBe(2);
    expect(useChatStore.getState().sessionId).toBe('new-session');
    expect((useChatStore.getState().messages[1] as AssistantMessage).error).toBeNull();
  });

  it('shows a friendly error on the assistant message when sending fails', async () => {
    setChatTransport(
      fakeTransport({
        sendMessage: vi.fn(async () => {
          throw new ChatStreamError('RATE_LIMITED', 'Đã chạm giới hạn', 429);
        }),
      }),
    );
    await useChatStore.getState().send('hi');
    const state = useChatStore.getState();
    expect(state.status).toBe('error');
    const a = state.messages[1] as AssistantMessage;
    expect(a.error).toBe('Đã chạm giới hạn');
    expect(a.streaming).toBe(false);
  });

  it('stop() aborts the stream and keeps the partial answer', async () => {
    const transport = fakeTransport({
      sendMessage: vi.fn(
        (
          _sid: string,
          _t: string,
          { onEvent, signal }: { onEvent: (e: ChatEvent) => void; signal?: AbortSignal },
        ) =>
          new Promise<void>((_resolve, reject) => {
            onEvent({ type: 'token', text: 'Đang viết' });
            signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      ),
    });
    setChatTransport(transport);
    const pending = useChatStore.getState().send('hi');
    await vi.waitFor(() => expect(transport.sendMessage).toHaveBeenCalled());
    useChatStore.getState().stop();
    await pending;
    const a = useChatStore.getState().messages[1] as AssistantMessage;
    expect(useChatStore.getState().status).toBe('idle');
    expect(a.text).toBe('Đang viết');
    expect(a.stopped).toBe(true);
    expect(a.streaming).toBe(false);
  });

  it('does not call the server when stopped before the request starts', async () => {
    const transport = fakeTransport();
    setChatTransport(transport);
    const pending = useChatStore.getState().send('hi');
    useChatStore.getState().stop();
    await pending;
    expect(transport.sendMessage).not.toHaveBeenCalled();
    expect((useChatStore.getState().messages[1] as AssistantMessage).stopped).toBe(true);
  });

  it('reset() forgets the session and the messages', async () => {
    setChatTransport(fakeTransport());
    await useChatStore.getState().send('hi');
    useChatStore.getState().reset();
    expect(useChatStore.getState().messages).toEqual([]);
    expect(useChatStore.getState().sessionId).toBeNull();
    expect(localStorage.getItem(CHAT_SESSION_KEY)).toBeNull();
  });

  it('ignores a second send while streaming', async () => {
    let release: () => void = () => {};
    const transport = fakeTransport({
      sendMessage: vi.fn(() => new Promise<void>((resolve) => (release = resolve))),
    });
    setChatTransport(transport);
    const first = useChatStore.getState().send('một');
    await vi.waitFor(() => expect(transport.sendMessage).toHaveBeenCalled());
    await useChatStore.getState().send('hai');
    release();
    await first;
    expect(transport.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not adopt a session that was created after a reset', async () => {
    let finishCreate: () => void = () => {};
    const transport = fakeTransport({
      createSession: vi.fn(
        () => new Promise<ChatSessionDTO>((resolve) => (finishCreate = () => resolve(session('orphan')))),
      ),
    });
    setChatTransport(transport);
    const pending = useChatStore.getState().send('hi');
    await vi.waitFor(() => expect(transport.createSession).toHaveBeenCalled());
    useChatStore.getState().reset();
    finishCreate();
    await pending;
    expect(useChatStore.getState().sessionId).toBeNull();
    expect(localStorage.getItem(CHAT_SESSION_KEY)).toBeNull();
    expect(transport.sendMessage).not.toHaveBeenCalled();
  });

  it('retry() resends the same text without duplicating the user message', async () => {
    let calls = 0;
    setChatTransport(
      fakeTransport({
        sendMessage: vi.fn(async (_sid: string, _t: string, { onEvent }) => {
          calls += 1;
          if (calls === 1) throw new ChatStreamError('NETWORK', 'Mất mạng');
          for (const e of REPLY) onEvent(e);
        }),
      }),
    );
    await useChatStore.getState().send('game 25 triệu');
    const failed = useChatStore.getState().messages[1] as AssistantMessage;
    expect(failed.error).toBe('Mất mạng');
    await useChatStore.getState().retry(failed.id);
    const { messages, status } = useChatStore.getState();
    expect(status).toBe('idle');
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(messages.filter((m) => m.role === 'user')).toHaveLength(1);
    expect((messages[1] as AssistantMessage).error).toBeNull();
    expect((messages[1] as AssistantMessage).text).toBe('Đây là 3 cấu hình phù hợp.');
  });

  it('retry() only acts on the latest answer', async () => {
    const transport = fakeTransport({
      sendMessage: vi.fn(async () => {
        throw new ChatStreamError('NETWORK', 'Mất mạng');
      }),
    });
    setChatTransport(transport);
    await useChatStore.getState().send('một');
    const first = useChatStore.getState().messages[1]!.id;
    await useChatStore.getState().send('hai');
    await useChatStore.getState().retry(first);
    expect(useChatStore.getState().messages).toHaveLength(4);
    expect(transport.sendMessage).toHaveBeenCalledTimes(2);
  });
});

describe('attachChatView', () => {
  function hangingTransport() {
    return fakeTransport({
      sendMessage: vi.fn(
        (_sid: string, _t: string, { signal }: { onEvent: (e: ChatEvent) => void; signal?: AbortSignal }) =>
          new Promise<void>((_resolve, reject) => {
            signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      ),
    });
  }

  it('stops the running answer once the page view is gone', async () => {
    const transport = hangingTransport();
    setChatTransport(transport);
    const detach = attachChatView();
    const pending = useChatStore.getState().send('hi');
    await vi.waitFor(() => expect(transport.sendMessage).toHaveBeenCalled());
    detach();
    await pending;
    expect((useChatStore.getState().messages[1] as AssistantMessage).stopped).toBe(true);
  });

  it('keeps the answer when the view re-attaches right away (remount, widget hand-off)', async () => {
    const transport = hangingTransport();
    setChatTransport(transport);
    const detach = attachChatView();
    void useChatStore.getState().send('hi');
    await vi.waitFor(() => expect(transport.sendMessage).toHaveBeenCalled());
    detach();
    const detachAgain = attachChatView();
    await new Promise((r) => setTimeout(r, 20));
    expect(useChatStore.getState().status).toBe('streaming');
    detachAgain();
    await vi.waitFor(() => expect(useChatStore.getState().status).toBe('idle'));
  });
});
