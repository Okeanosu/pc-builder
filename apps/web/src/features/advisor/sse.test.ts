import type { ChatEvent } from '@pc/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { ChatStreamError, createSseParser, readSseStream, streamChat } from './sse';

const frame = (e: ChatEvent) => `data: ${JSON.stringify(e)}\n\n`;

const EVENTS: ChatEvent[] = [
  { type: 'session', sessionId: 's1', mode: 'FALLBACK' },
  { type: 'tool', name: 'recommend_builds', status: 'start', label: 'Đang chọn linh kiện trong kho…' },
  { type: 'token', text: 'Cấu hình Cân bằng dồn 40% cho card đồ họa ' },
  { type: 'token', text: 'vì chơi game 2K phụ thuộc GPU.' },
  { type: 'done', messageId: 'm1', mode: 'FALLBACK' },
];
const WIRE = `: ping\n\n${EVENTS.map(frame).join('')}`;

function collect() {
  const events: ChatEvent[] = [];
  const parser = createSseParser((e) => events.push(e));
  return { events, parser };
}

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
}

describe('createSseParser', () => {
  it('parses whole frames and ignores comment heartbeats', () => {
    const { events, parser } = collect();
    parser.push(WIRE);
    expect(events).toEqual(EVENTS);
  });

  it('tolerates a chunk boundary at every possible position', () => {
    for (let cut = 1; cut < WIRE.length; cut += 1) {
      const { events, parser } = collect();
      parser.push(WIRE.slice(0, cut));
      parser.push(WIRE.slice(cut));
      expect(events, `cut at ${cut}`).toEqual(EVENTS);
    }
  });

  it('handles one character per chunk', () => {
    const { events, parser } = collect();
    for (const ch of WIRE) parser.push(ch);
    expect(events).toEqual(EVENTS);
  });

  it('accepts CRLF line endings, even split between chunks', () => {
    const crlf = WIRE.replace(/\n/g, '\r\n');
    for (let cut = 1; cut < crlf.length; cut += 7) {
      const { events, parser } = collect();
      parser.push(crlf.slice(0, cut));
      parser.push(crlf.slice(cut));
      expect(events, `cut at ${cut}`).toEqual(EVENTS);
    }
  });

  it('joins multi-line data fields and ignores other fields', () => {
    const { events, parser } = collect();
    parser.push('event: message\nid: 7\ndata: {"type":"token",\ndata: "text":"xin chào"}\n\n');
    expect(events).toEqual([{ type: 'token', text: 'xin chào' }]);
  });

  it('accepts "data:" without the optional space', () => {
    const { events, parser } = collect();
    parser.push('data:{"type":"token","text":"a"}\n\n');
    expect(events).toEqual([{ type: 'token', text: 'a' }]);
  });

  it('skips malformed JSON and payloads without a type, and keeps going', () => {
    const { events, parser } = collect();
    parser.push('data: {oops\n\ndata: [1,2]\n\ndata: {"text":"x"}\n\n');
    parser.push(frame({ type: 'token', text: 'ok' }));
    expect(events).toEqual([{ type: 'token', text: 'ok' }]);
  });

  it('emits a trailing frame without a blank line on flush', () => {
    const { events, parser } = collect();
    parser.push('data: {"type":"token","text":"cuối"}');
    expect(events).toEqual([]);
    parser.flush();
    expect(events).toEqual([{ type: 'token', text: 'cuối' }]);
  });
});

describe('readSseStream', () => {
  it('decodes UTF-8 characters split across byte chunks', async () => {
    const bytes = new TextEncoder().encode(WIRE);
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < bytes.length; i += 3) chunks.push(bytes.slice(i, i + 3));
    const events: ChatEvent[] = [];
    await readSseStream(streamOf(chunks), (e) => events.push(e));
    expect(events).toEqual(EVENTS);
  });
});

describe('streamChat', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(response: Response) {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => response);
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('posts the message with credentials and streams events', async () => {
    const fetchMock = stubFetch(
      new Response(WIRE, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );
    const events: ChatEvent[] = [];
    await streamChat('s1', 'chơi game 25 triệu', { onEvent: (e) => events.push(e) });
    expect(events).toEqual(EVENTS);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/chat\/sessions\/s1\/messages$/);
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'chơi game 25 triệu' });
  });

  it('turns HTTP 429 into a friendly Vietnamese error', async () => {
    stubFetch(
      new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const err = await streamChat('s1', 'hi', { onEvent: () => {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatStreamError);
    expect((err as ChatStreamError).status).toBe(429);
    expect((err as ChatStreamError).message).toMatch(/giới hạn/);
  });

  it('flags a missing session so the caller can start a new one', async () => {
    stubFetch(
      new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const err = (await streamChat('gone', 'hi', { onEvent: () => {} }).catch((e: unknown) => e)) as
      | ChatStreamError
      | undefined;
    expect(err?.code).toBe('SESSION_NOT_FOUND');
  });

  it('reports a network failure in Vietnamese', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const err = (await streamChat('s1', 'hi', { onEvent: () => {} }).catch((e: unknown) => e)) as
      | ChatStreamError
      | undefined;
    expect(err).toBeInstanceOf(ChatStreamError);
    expect(err?.code).toBe('NETWORK');
    expect(err?.message).toMatch(/kết nối/);
  });

  describe('expired session', () => {
    const realRefresh = useAuthStore.getState().refresh;
    afterEach(() => {
      useAuthStore.setState({ refresh: realRefresh });
      setAccessToken(null);
    });

    const unauthorized = () =>
      new Response(JSON.stringify({ error: { code: 'TOKEN_EXPIRED', message: 'Token expired' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    const sse = () => new Response(WIRE, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

    function stubSequence(...responses: Response[]) {
      const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => responses.shift()!);
      vi.stubGlobal('fetch', fetchMock);
      return fetchMock;
    }

    it('refreshes on 401 and retries once with the new token', async () => {
      setAccessToken('old');
      const refresh = vi.fn(async () => {
        setAccessToken('fresh');
        return 'fresh';
      });
      useAuthStore.setState({ refresh });
      const fetchMock = stubSequence(unauthorized(), sse());
      const events: ChatEvent[] = [];
      await streamChat('s1', 'hi', { onEvent: (e) => events.push(e) });
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(events).toEqual(EVENTS);
      const auth = fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get('Authorization'));
      expect(auth).toEqual(['Bearer old', 'Bearer fresh']);
    });

    it('also tries a refresh when the in-memory token is already gone', async () => {
      const refresh = vi.fn(async () => {
        setAccessToken('fresh');
        return 'fresh';
      });
      useAuthStore.setState({ refresh });
      stubSequence(unauthorized(), sse());
      await streamChat('s1', 'hi', { onEvent: () => {} });
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBe('fresh');
    });

    it('reports AUTH_EXPIRED in Vietnamese when the refresh fails, without a second post', async () => {
      setAccessToken('old');
      const refresh = vi.fn(async () => {
        setAccessToken(null);
        return null;
      });
      useAuthStore.setState({ refresh });
      const fetchMock = stubSequence(unauthorized());
      const err = (await streamChat('s1', 'hi', { onEvent: () => {} }).catch((e: unknown) => e)) as
        | ChatStreamError
        | undefined;
      expect(err).toBeInstanceOf(ChatStreamError);
      expect(err?.code).toBe('AUTH_EXPIRED');
      expect(err?.status).toBe(401);
      expect(err?.message).toMatch(/Phiên đăng nhập đã hết hạn/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not refresh twice when the retried request is still unauthorized', async () => {
      const refresh = vi.fn(async () => 'fresh');
      useAuthStore.setState({ refresh });
      const fetchMock = stubSequence(unauthorized(), unauthorized());
      const err = (await streamChat('s1', 'hi', { onEvent: () => {} }).catch((e: unknown) => e)) as
        | ChatStreamError
        | undefined;
      expect(err?.code).toBe('AUTH_EXPIRED');
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
