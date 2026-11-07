import { randomUUID } from 'node:crypto';
import type { ChatEvent, ChatMode } from '@pc/shared';
import type { ChatService, ChatSessionRow, Requester } from './chat.service';
import type { LlmClient } from './llm/types';
import {
  runTurn as defaultRunTurn,
  type RunTurnDeps,
  type RunTurnInput,
  type RunTurnResult,
} from './orchestrator';
import { openSse, type SseTarget } from './sse';
import type { ToolRegistry } from './tools/types';

export const TURN_ERROR_MESSAGE =
  'Xin lỗi anh/chị, hệ thống gặp lỗi khi xử lý tin nhắn. Anh/chị thử lại sau ít phút giúp em nhé.';

export interface TurnResponse extends SseTarget {
  writableFinished: boolean;
  destroyed: boolean;
}

export interface ChatTurnDeps {
  llm?: LlmClient;
  tools: ToolRegistry;
  chat: Pick<ChatService, 'loadHistory' | 'getIntent' | 'setIntent' | 'addUserMessage' | 'saveTurn'>;
  timeoutMs: number;
  logError(err: unknown, message: string): void;
  /** Injected by tests. */
  runTurn?: (input: RunTurnInput, deps: RunTurnDeps) => Promise<RunTurnResult>;
}

/**
 * One chat turn over SSE: stores the user message, streams `session` then runTurn's events, persists tool calls
 * and the reply, and only then sends `done`. A client disconnect aborts the turn. Errors that are not LLM
 * failures become an `error` event followed by `done`; the stream is always closed.
 */
export async function streamChatTurn(
  input: { session: ChatSessionRow; text: string; who: Requester },
  res: TurnResponse,
  deps: ChatTurnDeps,
): Promise<void> {
  const { session, text, who } = input;
  const started = Date.now();
  const history = await deps.chat.loadHistory(session.id);
  const previousIntent = await deps.chat.getIntent(session.id);
  await deps.chat.addUserMessage(session, text);

  const mode: ChatMode = deps.llm ? 'AI' : 'FALLBACK';
  const messageId = randomUUID();
  const sse = openSse(res);
  const abort = new AbortController();
  // `req` emits 'close' as soon as the body is read; only the response tells us the client really left.
  res.on('close', () => {
    if (!res.writableFinished) abort.abort();
  });
  if (res.destroyed && !res.writableFinished) abort.abort();
  sse.send({ type: 'session', sessionId: session.id, mode });

  let done: Extract<ChatEvent, { type: 'done' }> | undefined;
  const emit = (e: ChatEvent) => {
    if (e.type === 'done') done = e;
    else sse.send(e);
  };
  try {
    const result = await (deps.runTurn ?? defaultRunTurn)(
      {
        sessionId: session.id,
        userText: text,
        history,
        previousIntent,
        ctx: { sessionId: session.id, userId: who.userId, guestId: who.guestId },
        messageId,
      },
      { llm: deps.llm, tools: deps.tools, emit, timeoutMs: deps.timeoutMs, signal: abort.signal },
    );
    done ??= { type: 'done', messageId: result.messageId, mode: result.mode };
    await deps.chat.saveTurn(session.id, result, Date.now() - started);
    if (result.intent) await deps.chat.setIntent(session.id, result.intent);
  } catch (err) {
    deps.logError(err, 'chat turn failed');
    sse.send({ type: 'error', code: 'INTERNAL', message: TURN_ERROR_MESSAGE });
  } finally {
    sse.send(done ?? { type: 'done', messageId, mode });
    sse.close();
  }
}
