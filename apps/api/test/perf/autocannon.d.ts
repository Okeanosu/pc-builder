// Minimal typings for the parts of autocannon 8 the perf scripts use (the package ships none).
declare module 'autocannon' {
  import type { EventEmitter } from 'node:events';

  export interface RequestParams {
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
  }

  export interface AutocannonRequest extends RequestParams {
    setupRequest?: (req: RequestParams, context: Record<string, unknown>) => RequestParams;
    onResponse?: (
      status: number,
      body: string,
      context: Record<string, unknown>,
      headers: Record<string, string>,
    ) => void;
  }

  export interface Options {
    url: string;
    connections?: number;
    duration?: number;
    pipelining?: number;
    timeout?: number;
    headers?: Record<string, string>;
    requests?: AutocannonRequest[];
  }

  export interface Histogram {
    average: number;
    mean: number;
    stddev: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p97_5: number;
    p99: number;
  }

  export interface Result {
    requests: Histogram & { total: number; sent: number };
    latency: Histogram;
    throughput: Histogram;
    errors: number;
    timeouts: number;
    non2xx: number;
    resets: number;
    duration: number;
    statusCodeStats: Record<string, { count: number }>;
  }

  export interface Instance extends EventEmitter, PromiseLike<Result> {
    stop(): void;
  }

  function autocannon(opts: Options): Instance;
  export default autocannon;
}
