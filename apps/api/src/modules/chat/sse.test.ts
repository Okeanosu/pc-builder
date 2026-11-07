import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEARTBEAT_MS, openSse, type SseTarget } from './sse';

class FakeResponse extends EventEmitter implements SseTarget {
  statusCode = 0;
  writableEnded = false;
  headers: Record<string, string> = {};
  chunks: string[] = [];
  flushed = false;
  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }
  flushHeaders() {
    this.flushed = true;
  }
  write(chunk: string) {
    this.chunks.push(chunk);
    return true;
  }
  end() {
    this.writableEnded = true;
  }
}

const expressResponseFits = (res: Response): SseTarget => res;
void expressResponseFits;

describe('openSse', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sets event-stream headers and flushes them immediately', () => {
    const res = new FakeResponse();
    openSse(res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers.connection).toBe('keep-alive');
    expect(res.flushed).toBe(true);
  });

  it('writes each ChatEvent as one data line', () => {
    const res = new FakeResponse();
    const sse = openSse(res);
    sse.send({ type: 'token', text: 'Xin chào' });
    sse.send({ type: 'done', messageId: 'm1', mode: 'AI' });
    expect(res.chunks).toEqual([
      'data: {"type":"token","text":"Xin chào"}\n\n',
      'data: {"type":"done","messageId":"m1","mode":"AI"}\n\n',
    ]);
  });

  it('sends a heartbeat comment every 15 seconds', () => {
    const res = new FakeResponse();
    openSse(res);
    expect(HEARTBEAT_MS).toBe(15_000);
    vi.advanceTimersByTime(HEARTBEAT_MS * 2);
    expect(res.chunks.filter((c) => c.startsWith(':'))).toHaveLength(2);
    expect(res.chunks[0]).toMatch(/^:.*\n\n$/);
  });

  it('close ends the response, stops the heartbeat and ignores later sends', () => {
    const res = new FakeResponse();
    const sse = openSse(res);
    sse.close();
    sse.close();
    sse.send({ type: 'token', text: 'late' });
    vi.advanceTimersByTime(HEARTBEAT_MS * 3);
    expect(res.writableEnded).toBe(true);
    expect(res.chunks).toEqual([]);
  });

  it('stops writing once the client disconnects', () => {
    const res = new FakeResponse();
    const sse = openSse(res);
    res.emit('close');
    sse.send({ type: 'token', text: 'nobody listens' });
    vi.advanceTimersByTime(HEARTBEAT_MS * 2);
    expect(res.chunks).toEqual([]);
  });
});
