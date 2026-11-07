import type { ChatEvent } from '@pc/shared';

export const HEARTBEAT_MS = 15_000;

/** The slice of Express `Response` the writer needs (kept structural so tests can use a fake). */
export interface SseTarget {
  statusCode: number;
  writableEnded: boolean;
  setHeader(name: string, value: string): unknown;
  flushHeaders(): void;
  write(chunk: string): boolean;
  end(): unknown;
  on(event: 'close', listener: () => void): unknown;
}

export interface SseWriter {
  send(event: ChatEvent): void;
  close(): void;
}

export function openSse(res: SseTarget): SseWriter {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let open = true;
  const writable = () => open && !res.writableEnded;
  // Comment lines keep proxies and browsers from timing out an idle stream while Gemini is thinking.
  const heartbeat = setInterval(() => {
    if (writable()) res.write(': ping\n\n');
  }, HEARTBEAT_MS);
  heartbeat.unref?.();

  const stop = () => {
    open = false;
    clearInterval(heartbeat);
  };
  res.on('close', stop);

  return {
    send(event) {
      if (writable()) res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    close() {
      if (!open) return;
      stop();
      if (!res.writableEnded) res.end();
    },
  };
}
