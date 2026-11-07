import {
  ApiError,
  type Content,
  type GenerateContentParameters,
  type GenerateContentResponse,
  GoogleGenAI,
  type Part,
} from '@google/genai';
import { type LlmClient, type LlmMessage, type LlmPart, LlmUnavailableError } from './types';

export type GenerateContentStream = (
  params: GenerateContentParameters,
) => Promise<AsyncGenerator<GenerateContentResponse>>;

export interface GeminiLogger {
  warn(message: string): void;
}

export interface GeminiClientOptions {
  apiKey: string;
  model: string;
  logger?: GeminiLogger;
  /** Injected by tests; defaults to `new GoogleGenAI({ apiKey }).models.generateContentStream`. */
  generateContentStream?: GenerateContentStream;
}

function toPart(part: LlmPart): Part {
  if ('text' in part) return { text: part.text };
  if ('functionCall' in part) {
    return {
      functionCall: { name: part.functionCall.name, args: part.functionCall.args },
      ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
    };
  }
  return { functionResponse: { name: part.functionResponse.name, response: part.functionResponse.response } };
}

const toContent = (m: LlmMessage): Content => ({ role: m.role, parts: m.parts.map(toPart) });

function httpStatus(err: unknown): number | undefined {
  if (err instanceof ApiError) return err.status;
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : undefined;
}

const isAbortError = (err: unknown) =>
  err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');

/** Maps SDK/network failures to the reasons the orchestrator uses to switch to fallback mode. */
export function toLlmUnavailable(
  err: unknown,
  signal: AbortSignal | undefined,
  logger: GeminiLogger,
): LlmUnavailableError {
  if (err instanceof LlmUnavailableError) return err;
  const status = httpStatus(err);
  const message = err instanceof Error ? err.message : String(err);
  if (signal?.aborted || isAbortError(err) || status === 408 || status === 504) {
    logger.warn('Gemini request timed out; answering in fallback mode.');
    return new LlmUnavailableError('TIMEOUT', message);
  }
  if (status === 429) {
    logger.warn('Gemini rate limit or quota exceeded (HTTP 429); answering in fallback mode.');
    return new LlmUnavailableError('RATE_LIMIT', message);
  }
  if (status === 401 || status === 403 || (status === 400 && /api key/i.test(message))) {
    logger.warn(
      `Gemini rejected the API key (HTTP ${status}); check GEMINI_API_KEY. Chat stays in fallback mode until it is fixed.`,
    );
    return new LlmUnavailableError('UPSTREAM', message);
  }
  logger.warn(
    `Gemini request failed (${status ? `HTTP ${status}` : 'network'}): ${message}; answering in fallback mode.`,
  );
  return new LlmUnavailableError('UPSTREAM', message);
}

const consoleLogger: GeminiLogger = { warn: (m) => console.warn(m) };

/** LlmClient over @google/genai streaming with function calling; every failure surfaces as LlmUnavailableError. */
export function createGeminiClient(opts: GeminiClientOptions): LlmClient {
  const logger = opts.logger ?? consoleLogger;
  const generate =
    opts.generateContentStream ?? new GoogleGenAI({ apiKey: opts.apiKey }).models.generateContentStream;

  return {
    async *stream({ system, history, tools, signal }) {
      try {
        const response = await generate({
          model: opts.model,
          contents: history.map(toContent),
          config: {
            systemInstruction: system,
            ...(tools.length > 0
              ? {
                  tools: [
                    {
                      functionDeclarations: tools.map((t) => ({
                        name: t.name,
                        description: t.description,
                        parametersJsonSchema: t.parametersJsonSchema,
                      })),
                    },
                  ],
                }
              : {}),
            abortSignal: signal,
          },
        });
        for await (const chunk of response) {
          for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
            if (part.thought) continue;
            if (part.functionCall?.name) {
              yield {
                type: 'functionCall',
                name: part.functionCall.name,
                args: part.functionCall.args ?? {},
                ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
              };
            } else if (part.text) {
              yield { type: 'text', text: part.text };
            }
          }
        }
      } catch (err) {
        throw toLlmUnavailable(err, signal, logger);
      }
    },
  };
}
