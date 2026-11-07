import type { ApiErrorBody, ChatEvent } from '@pc/shared';
import { API_URL, getAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export type ChatStreamErrorCode = 'RATE_LIMITED' | 'SESSION_NOT_FOUND' | 'NETWORK' | 'HTTP' | 'BAD_STREAM';

export class ChatStreamError extends Error {
  constructor(
    public code: ChatStreamErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ChatStreamError';
  }
}

export const CHAT_ERROR_TEXT = {
  rateLimited: 'Đã chạm giới hạn 10 tin nhắn mỗi phút. Chờ một chút rồi gửi lại nhé.',
  network: 'Không kết nối được máy chủ tư vấn. Kiểm tra mạng rồi thử lại.',
  server: 'Máy chủ tư vấn đang bận. Thử gửi lại sau ít giây.',
  badStream: 'Kết nối tới trợ lý bị gián đoạn. Gửi lại tin nhắn để tiếp tục.',
} as const;

function isChatEvent(value: unknown): value is ChatEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Incremental parser for `text/event-stream`: feed it decoded text in arbitrary pieces.
 * Only `data:` fields matter; comments (`: ping`), other fields and malformed payloads are dropped.
 */
export function createSseParser(onEvent: (event: ChatEvent) => void) {
  let buffer = '';

  const dispatch = (block: string) => {
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const value = line.slice(5);
      data.push(value.startsWith(' ') ? value.slice(1) : value);
    }
    if (data.length === 0) return;
    try {
      const parsed: unknown = JSON.parse(data.join('\n'));
      if (isChatEvent(parsed)) onEvent(parsed);
    } catch {
      // A broken frame must not end the whole reply.
    }
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      // Keep a trailing \r: it may be the first half of a CRLF split across chunks.
      const keepCr = buffer.endsWith('\r');
      let text = (keepCr ? buffer.slice(0, -1) : buffer).replace(/\r\n?/g, '\n');
      let boundary = text.indexOf('\n\n');
      while (boundary !== -1) {
        dispatch(text.slice(0, boundary));
        text = text.slice(boundary + 2);
        boundary = text.indexOf('\n\n');
      }
      buffer = keepCr ? `${text}\r` : text;
    },
    flush() {
      const rest = buffer.replace(/\r\n?/g, '\n');
      buffer = '';
      if (rest.trim()) dispatch(rest);
    },
  };
}

export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser(onEvent);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.flush();
  } finally {
    reader.releaseLock();
  }
}

async function errorFromResponse(res: Response): Promise<ChatStreamError> {
  const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
  if (res.status === 429) return new ChatStreamError('RATE_LIMITED', CHAT_ERROR_TEXT.rateLimited, 429);
  if (res.status === 404 || res.status === 403) {
    return new ChatStreamError(
      'SESSION_NOT_FOUND',
      'Cuộc trò chuyện cũ không còn nữa. Đã mở cuộc trò chuyện mới.',
      res.status,
    );
  }
  if (res.status >= 500) return new ChatStreamError('HTTP', CHAT_ERROR_TEXT.server, res.status);
  return new ChatStreamError('HTTP', body?.error.message ?? CHAT_ERROR_TEXT.server, res.status);
}

interface StreamChatOptions {
  signal?: AbortSignal;
  onEvent: (event: ChatEvent) => void;
}

async function post(sessionId: string, text: string, signal?: AbortSignal): Promise<Response> {
  const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'text/event-stream' });
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    return await fetch(`${API_URL}/chat/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ChatStreamError('NETWORK', CHAT_ERROR_TEXT.network);
  }
}

/** Sends one message and resolves when the server closes the event stream. Rejects with ChatStreamError. */
export async function streamChat(sessionId: string, text: string, { signal, onEvent }: StreamChatOptions) {
  let res = await post(sessionId, text, signal);
  if (res.status === 401 && getAccessToken()) {
    const token = await useAuthStore.getState().refresh();
    if (token) res = await post(sessionId, text, signal);
  }
  if (!res.ok) throw await errorFromResponse(res);
  if (!res.body) throw new ChatStreamError('BAD_STREAM', CHAT_ERROR_TEXT.badStream, res.status);
  try {
    await readSseStream(res.body, onEvent);
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ChatStreamError('BAD_STREAM', CHAT_ERROR_TEXT.badStream);
  }
}
