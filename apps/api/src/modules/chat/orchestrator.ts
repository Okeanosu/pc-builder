import { randomUUID } from 'node:crypto';
import type { ChatEvent, ChatMode } from '@pc/shared';
import { type ParsedIntent, parseIntent } from './fallback/nlu';
import { isRecommendOutput, mergeRecommendArgs, respondFallback } from './fallback/responder';
import {
  type LlmChunk,
  type LlmClient,
  type LlmMessage,
  type LlmPart,
  type LlmToolDecl,
  LlmUnavailableError,
  type LlmUnavailableReason,
} from './llm/types';
import { SYSTEM_PROMPT } from './prompts';
import { executeTool, type ToolCallRecord } from './tools/execute';
import type { RecommendToolOutput, ToolContext, ToolRegistry } from './tools/types';

export const MAX_TOOL_ROUNDS = 4;
export const DEFAULT_LLM_TIMEOUT_MS = 20_000;

export const ROUND_LIMIT_TEXT =
  'Xin lỗi anh/chị, yêu cầu này cần quá nhiều bước tra cứu nên em tạm dừng ở đây. ' +
  'Anh/chị nói ngắn gọn nhu cầu và ngân sách (ví dụ: "chơi game 25 triệu") để em gợi ý lại nhé.';

export interface RunTurnInput {
  sessionId: string;
  userText: string;
  /** Prior turns only; the current `userText` is appended by runTurn. */
  history: LlmMessage[];
  previousIntent?: ParsedIntent;
  ctx: ToolContext;
  /** Id for the assistant message, echoed in the `done` event; generated when omitted. */
  messageId?: string;
}

export interface RunTurnDeps {
  llm?: LlmClient;
  tools: ToolRegistry;
  emit: (e: ChatEvent) => void;
  timeoutMs?: number;
  /** Abort when the client disconnects: cancels the in-flight model call and stops the turn (no fallback). */
  signal?: AbortSignal;
}

export interface RunTurnResult {
  mode: ChatMode;
  assistantText: string;
  buildIds: string[];
  /** Intent to persist and pass back as `previousIntent` next turn (set in both modes). */
  intent?: ParsedIntent;
  messageId: string;
  toolCalls: ToolCallRecord[];
  fallbackReason?: LlmUnavailableReason;
  /** True when `deps.signal` aborted the turn; `assistantText` then holds only what was streamed so far. */
  cancelled?: boolean;
}

interface TurnState {
  text: string;
  buildIds: string[];
  toolCalls: ToolCallRecord[];
  recommendation?: {
    output: RecommendToolOutput;
    args: Record<string, unknown>;
    source: 'recommend_builds' | 'modify_build';
  };
  recommendArgs?: Record<string, unknown>;
}

class TurnCancelledError extends Error {
  constructor() {
    super('chat turn cancelled');
  }
}

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new TurnCancelledError();
}

const FALLBACK_CHUNK_WORDS = 4;

/** Splits text into word groups whose concatenation is exactly the input. */
export function chunkText(text: string, wordsPerChunk = FALLBACK_CHUNK_WORDS): string[] {
  const words = text.split(/(?<=\s)(?=\S)/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(''));
  }
  return chunks.filter((c) => c.length > 0);
}

function toUnavailable(err: unknown, signal: AbortSignal): LlmUnavailableError {
  if (err instanceof LlmUnavailableError) return err;
  if (signal.aborted) return new LlmUnavailableError('TIMEOUT', 'LLM call timed out');
  return new LlmUnavailableError('UPSTREAM', err instanceof Error ? err.message : String(err));
}

/** Iterates `source` but rejects as soon as `signal` aborts, even if the source never yields again. */
async function* untilAborted<T>(source: AsyncIterable<T>, signal: AbortSignal): AsyncGenerator<T> {
  const iterator = source[Symbol.asyncIterator]();
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new LlmUnavailableError('TIMEOUT', 'LLM call timed out'));
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  aborted.catch(() => {});
  try {
    while (true) {
      const step = await Promise.race([iterator.next(), aborted]);
      if (step.done) return;
      yield step.value;
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    Promise.resolve(iterator.return?.()).catch(() => {});
  }
}

type FunctionCallChunk = Extract<LlmChunk, { type: 'functionCall' }>;

async function streamRound(
  llm: LlmClient,
  request: { system: string; history: LlmMessage[]; tools: LlmToolDecl[] },
  timeoutMs: number,
  onText: (text: string) => void,
  cancel: AbortSignal | undefined,
): Promise<{ text: string; calls: FunctionCallChunk[] }> {
  throwIfCancelled(cancel);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onCancel = () => controller.abort();
  cancel?.addEventListener('abort', onCancel, { once: true });
  let text = '';
  const calls: FunctionCallChunk[] = [];
  try {
    for await (const chunk of untilAborted(
      llm.stream({ ...request, signal: controller.signal }),
      controller.signal,
    )) {
      if (chunk.type === 'functionCall') calls.push(chunk);
      else if (chunk.text) {
        text += chunk.text;
        onText(chunk.text);
      }
    }
  } catch (err) {
    if (cancel?.aborted) throw new TurnCancelledError();
    throw toUnavailable(err, controller.signal);
  } finally {
    clearTimeout(timer);
    cancel?.removeEventListener('abort', onCancel);
  }
  return { text, calls };
}

/** Puts a blank line between text already streamed (possibly cut mid-sentence) and what follows. */
function separatorAfter(text: string): string {
  if (!text.trim() || text.endsWith('\n\n')) return '';
  return text.endsWith('\n') ? '\n' : '\n\n';
}

const withCallId = (id: string | undefined) => (id ? { id } : {});

/** Appends the new message; a trailing user turn (e.g. left by a cancelled turn) is extended so roles alternate. */
function withUserText(history: LlmMessage[], text: string): LlmMessage[] {
  const last = history.at(-1);
  if (last?.role !== 'user') return [...history, { role: 'user', parts: [{ text }] }];
  return [...history.slice(0, -1), { role: 'user', parts: [...last.parts, { text }] }];
}

async function runAiLoop(
  llm: LlmClient,
  input: RunTurnInput,
  deps: RunTurnDeps,
  state: TurnState,
  emitText: (text: string) => void,
): Promise<void> {
  const messages = withUserText(input.history, input.userText);
  const tools = [...deps.tools.values()].map((t) => t.decl);
  const timeoutMs = deps.timeoutMs ?? DEFAULT_LLM_TIMEOUT_MS;

  for (let round = 0; ; round += 1) {
    const { text, calls } = await streamRound(
      llm,
      { system: SYSTEM_PROMPT, history: messages, tools },
      timeoutMs,
      emitText,
      deps.signal,
    );
    if (calls.length === 0) {
      if (!text.trim()) throw new LlmUnavailableError('UPSTREAM', 'empty model response');
      return;
    }
    if (round >= MAX_TOOL_ROUNDS) {
      emitText(separatorAfter(state.text) + ROUND_LIMIT_TEXT);
      return;
    }
    const modelParts: LlmPart[] = text ? [{ text }] : [];
    for (const c of calls) {
      modelParts.push({
        functionCall: { ...withCallId(c.id), name: c.name, args: c.args },
        ...(c.thoughtSignature ? { thoughtSignature: c.thoughtSignature } : {}),
      });
    }
    messages.push({ role: 'model', parts: modelParts });

    const responses: LlmPart[] = [];
    for (const c of calls) {
      throwIfCancelled(deps.signal);
      const { record, result } = await executeTool(deps.tools, c.name, c.args, input.ctx, deps.emit);
      state.toolCalls.push(record);
      state.buildIds.push(...(result?.buildIds ?? []));
      if (
        record.ok &&
        (c.name === 'recommend_builds' || c.name === 'modify_build') &&
        isRecommendOutput(record.response)
      ) {
        state.recommendation = { output: record.response, args: c.args, source: c.name };
      }
      if (record.ok && c.name === 'recommend_builds') state.recommendArgs = c.args;
      responses.push({ functionResponse: { ...withCallId(c.id), name: c.name, response: record.response } });
    }
    messages.push({ role: 'user', parts: responses });
  }
}

/**
 * One chat turn: Gemini with tool calling when available, otherwise (no key, 429, timeout, upstream error,
 * empty answer) the rule-based responder. Streams ChatEvents through `deps.emit` and always ends with `done`.
 */
export async function runTurn(input: RunTurnInput, deps: RunTurnDeps): Promise<RunTurnResult> {
  const messageId = input.messageId ?? randomUUID();
  const state: TurnState = { text: '', buildIds: [], toolCalls: [] };
  const emitText = (text: string) => {
    if (!text) return;
    state.text += text;
    deps.emit({ type: 'token', text });
  };

  let mode: ChatMode = deps.llm ? 'AI' : 'FALLBACK';
  let intent: ParsedIntent | undefined;
  let unavailable: LlmUnavailableError | undefined;
  let cancelled = false;
  try {
    throwIfCancelled(deps.signal);
    if (!deps.llm) throw new LlmUnavailableError('NO_KEY');
    await runAiLoop(deps.llm, input, deps, state, emitText);
    const parsed = parseIntent(input.userText, input.previousIntent);
    intent = state.recommendArgs ? mergeRecommendArgs(parsed, state.recommendArgs) : parsed;
  } catch (err) {
    if (err instanceof TurnCancelledError) cancelled = true;
    else if (!(err instanceof LlmUnavailableError)) throw err;
    else if (deps.signal?.aborted) cancelled = true;
    else unavailable = err;
  }

  if (unavailable) {
    mode = 'FALLBACK';
    const reply = await respondFallback(
      {
        userText: input.userText,
        previousIntent: input.previousIntent,
        ctx: input.ctx,
        prior: state.recommendation,
      },
      { tools: deps.tools, emit: deps.emit },
    );
    state.toolCalls.push(...reply.toolCalls);
    state.buildIds.push(...reply.buildIds);
    intent = reply.intent;
    for (const chunk of chunkText(separatorAfter(state.text) + reply.text)) emitText(chunk);
  }

  deps.emit({ type: 'done', messageId, mode });
  return {
    mode,
    assistantText: state.text,
    buildIds: [...new Set(state.buildIds)],
    intent,
    messageId,
    toolCalls: state.toolCalls,
    ...(unavailable ? { fallbackReason: unavailable.reason } : {}),
    ...(cancelled ? { cancelled } : {}),
  };
}
