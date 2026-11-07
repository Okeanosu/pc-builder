import {
  ApiError,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type Part,
} from '@google/genai';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../config/env';
import { createLlmFromEnv } from './factory';
import { createGeminiClient, type GenerateContentStream } from './gemini-client';
import { type LlmChunk, type LlmMessage, type LlmToolDecl, LlmUnavailableError } from './types';

const response = (...parts: Part[]) =>
  ({ candidates: [{ content: { role: 'model', parts } }] }) as unknown as GenerateContentResponse;

function fakeGenerate(steps: Array<GenerateContentResponse | Error>, openError?: Error) {
  const requests: GenerateContentParameters[] = [];
  const generate: GenerateContentStream = async (params) => {
    requests.push(params);
    if (openError) throw openError;
    return (async function* () {
      for (const step of steps) {
        if (step instanceof Error) throw step;
        yield step;
      }
    })();
  };
  return { generate, requests };
}

function silentLogger() {
  const warnings: string[] = [];
  return { warnings, logger: { warn: (m: string) => warnings.push(m) } };
}

async function collect(iter: AsyncIterable<LlmChunk>): Promise<LlmChunk[]> {
  const out: LlmChunk[] = [];
  for await (const c of iter) out.push(c);
  return out;
}

async function failure(iter: AsyncIterable<LlmChunk>): Promise<LlmUnavailableError> {
  try {
    await collect(iter);
  } catch (err) {
    if (err instanceof LlmUnavailableError) return err;
    throw err;
  }
  throw new Error('expected the stream to fail');
}

const TOOL: LlmToolDecl = {
  name: 'recommend_builds',
  description: 'Gợi ý cấu hình',
  parametersJsonSchema: { type: 'object', properties: { budget: { type: 'integer' } } },
};

const HISTORY: LlmMessage[] = [
  { role: 'user', parts: [{ text: 'chơi game 25tr' }] },
  {
    role: 'model',
    parts: [
      { functionCall: { name: 'recommend_builds', args: { budget: 25_000_000 } }, thoughtSignature: 'sig-1' },
    ],
  },
  { role: 'user', parts: [{ functionResponse: { name: 'recommend_builds', response: { builds: [] } } }] },
];

describe('createGeminiClient', () => {
  it('maps system prompt, history and tools onto generateContentStream', async () => {
    const { generate, requests } = fakeGenerate([response({ text: 'ok' })]);
    const llm = createGeminiClient({
      apiKey: 'k',
      model: 'gemini-flash-latest',
      generateContentStream: generate,
    });
    const signal = new AbortController().signal;
    await collect(llm.stream({ system: 'SYS', history: HISTORY, tools: [TOOL], signal }));

    expect(requests).toHaveLength(1);
    const req = requests[0];
    expect(req?.model).toBe('gemini-flash-latest');
    expect(req?.contents).toEqual([
      { role: 'user', parts: [{ text: 'chơi game 25tr' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: { name: 'recommend_builds', args: { budget: 25_000_000 } },
            thoughtSignature: 'sig-1',
          },
        ],
      },
      { role: 'user', parts: [{ functionResponse: { name: 'recommend_builds', response: { builds: [] } } }] },
    ]);
    expect(req?.config?.systemInstruction).toBe('SYS');
    expect(req?.config?.tools).toEqual([
      {
        functionDeclarations: [
          { name: TOOL.name, description: TOOL.description, parametersJsonSchema: TOOL.parametersJsonSchema },
        ],
      },
    ]);
    expect(req?.config?.abortSignal).toBe(signal);
  });

  it('omits the tools config when there are no tools', async () => {
    const { generate, requests } = fakeGenerate([response({ text: 'ok' })]);
    const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate });
    await collect(llm.stream({ system: 'SYS', history: [], tools: [] }));
    expect(requests[0]?.config?.tools).toBeUndefined();
  });

  it('yields text and function calls, skipping thought parts and keeping thought signatures', async () => {
    const { generate } = fakeGenerate([
      response({ text: 'thinking…', thought: true }),
      response({ text: 'Dạ, ' }),
      response(
        { text: 'em tìm nhé.' },
        { functionCall: { name: 'recommend_builds', args: { budget: 1 } }, thoughtSignature: 's' },
      ),
      response({ functionCall: { name: 'search_products' } }),
      { candidates: [] } as unknown as GenerateContentResponse,
    ]);
    const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate });
    expect(await collect(llm.stream({ system: '', history: [], tools: [TOOL] }))).toEqual([
      { type: 'text', text: 'Dạ, ' },
      { type: 'text', text: 'em tìm nhé.' },
      { type: 'functionCall', name: 'recommend_builds', args: { budget: 1 }, thoughtSignature: 's' },
      { type: 'functionCall', name: 'search_products', args: {} },
    ]);
  });

  it('maps HTTP 429 to RATE_LIMIT', async () => {
    const { generate } = fakeGenerate([], new ApiError({ message: 'RESOURCE_EXHAUSTED', status: 429 }));
    const { logger } = silentLogger();
    const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate, logger });
    expect((await failure(llm.stream({ system: '', history: [], tools: [] }))).reason).toBe('RATE_LIMIT');
  });

  it('maps a 429 raised mid-stream to RATE_LIMIT after the chunks already received', async () => {
    const { generate } = fakeGenerate([
      response({ text: 'Dạ' }),
      new ApiError({ message: 'quota', status: 429 }),
    ]);
    const { logger } = silentLogger();
    const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate, logger });
    const seen: LlmChunk[] = [];
    const err = await failure(
      (async function* () {
        for await (const c of llm.stream({ system: '', history: [], tools: [] })) {
          seen.push(c);
          yield c;
        }
      })(),
    );
    expect(seen).toEqual([{ type: 'text', text: 'Dạ' }]);
    expect(err.reason).toBe('RATE_LIMIT');
  });

  it('maps an aborted request to TIMEOUT', async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
    const { generate } = fakeGenerate([], abortError);
    const { logger } = silentLogger();
    const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate, logger });
    const err = await failure(llm.stream({ system: '', history: [], tools: [], signal: controller.signal }));
    expect(err.reason).toBe('TIMEOUT');
  });

  it('maps an AbortError without a signal to TIMEOUT too', async () => {
    const { generate } = fakeGenerate([], Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    const { logger } = silentLogger();
    const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate, logger });
    expect((await failure(llm.stream({ system: '', history: [], tools: [] }))).reason).toBe('TIMEOUT');
  });

  it.each([401, 403])('maps HTTP %d to UPSTREAM and logs a key hint', async (status) => {
    const { generate } = fakeGenerate([], new ApiError({ message: 'PERMISSION_DENIED', status }));
    const { logger, warnings } = silentLogger();
    const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate, logger });
    expect((await failure(llm.stream({ system: '', history: [], tools: [] }))).reason).toBe('UPSTREAM');
    expect(warnings.join('\n')).toMatch(/GEMINI_API_KEY/);
  });

  it('treats "API key not valid" (HTTP 400) as a key problem as well', async () => {
    const { generate } = fakeGenerate(
      [],
      new ApiError({ message: 'API key not valid. Please pass a valid API key.', status: 400 }),
    );
    const { logger, warnings } = silentLogger();
    const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate, logger });
    expect((await failure(llm.stream({ system: '', history: [], tools: [] }))).reason).toBe('UPSTREAM');
    expect(warnings.join('\n')).toMatch(/GEMINI_API_KEY/);
  });

  it('maps other failures to UPSTREAM', async () => {
    const { logger } = silentLogger();
    for (const error of [new ApiError({ message: 'INTERNAL', status: 500 }), new TypeError('fetch failed')]) {
      const { generate } = fakeGenerate([], error);
      const llm = createGeminiClient({ apiKey: 'k', model: 'm', generateContentStream: generate, logger });
      expect((await failure(llm.stream({ system: '', history: [], tools: [] }))).reason).toBe('UPSTREAM');
    }
  });

  it('never leaks the API key into logs', async () => {
    const { generate } = fakeGenerate([], new ApiError({ message: 'denied', status: 403 }));
    const { logger, warnings } = silentLogger();
    const llm = createGeminiClient({
      apiKey: 'super-secret-key',
      model: 'm',
      generateContentStream: generate,
      logger,
    });
    await failure(llm.stream({ system: '', history: [], tools: [] }));
    expect(warnings.join('\n')).not.toContain('super-secret-key');
  });
});

describe('createLlmFromEnv', () => {
  it('returns undefined without a key so chat starts in fallback mode', () => {
    expect(createLlmFromEnv(loadEnv({ GEMINI_API_KEY: '' }))).toBeUndefined();
  });

  it('returns a Gemini client when a key is configured (no network on construction)', () => {
    const llm = createLlmFromEnv(
      loadEnv({ GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-flash-latest' }),
    );
    expect(llm).toBeDefined();
    expect(typeof llm?.stream).toBe('function');
  });
});
