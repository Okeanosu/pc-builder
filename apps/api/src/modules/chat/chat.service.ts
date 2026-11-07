import type { BuildDTO, ChatMessageDTO, ChatMode, ChatSessionDTO, Role } from '@pc/shared';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { chatMessages, chatSessions } from '../../db/schema';
import type { AppDeps } from '../../deps';
import { createBuildsService } from '../builds';
import { isUuid } from '../catalog';
import { HISTORY_LIMIT, type HistoryRow, toLlmHistory } from './chat.history';
import type { ParsedIntent } from './fallback/nlu';
import type { LlmMessage } from './llm/types';
import type { RunTurnResult } from './orchestrator';

export const CHAT_RATE_LIMIT = 10;
export const SESSION_CREATE_LIMIT = 10;
/** Per-address caps shared by everyone behind one IP, so rotating the guest cookie cannot lift the caps above. */
export const CHAT_IP_RATE_LIMIT = 40;
export const SESSION_CREATE_IP_LIMIT = 30;
export const TITLE_MAX_CHARS = 60;
export const INTENT_TTL_SECONDS = 24 * 3600;
export const intentKey = (sessionId: string) => `chat:intent:${sessionId}`;

export type ChatSessionRow = typeof chatSessions.$inferSelect;

export interface Requester {
  userId?: string;
  role?: Role;
  guestId?: string;
}

/** A logged-in user owns by user id; a guest by the gid cookie. Only the owner may write into a session. */
export function isSessionOwner(session: ChatSessionRow, who: Requester): boolean {
  if (session.userId) return session.userId === who.userId;
  return session.guestId !== null && session.guestId === who.guestId;
}

/** Read access: the owner, plus staff and admins (read-only, for reviewing conversations). */
export function canAccessSession(session: ChatSessionRow, who: Requester): boolean {
  return who.role === 'STAFF' || who.role === 'ADMIN' || isSessionOwner(session, who);
}

const isVisible = (r: { role: string; content: string; buildIds: string[] }) =>
  r.role === 'user' || r.content.trim() !== '' || r.buildIds.length > 0;

export const sessionTitle = (text: string) =>
  Array.from(text.trim()).slice(0, TITLE_MAX_CHARS).join('').trim();

// Postgres rejects NUL in text and jsonb; a model or a pasted string could still contain one.
const stripNul = (s: string) => s.replaceAll('\u0000', '');
function sanitizeJson(value: unknown): unknown {
  if (typeof value === 'string') return stripNul(value);
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [stripNul(k), sanitizeJson(v)]));
  }
  return value;
}

const toSessionDTO = (row: ChatSessionRow, messages: ChatMessageDTO[]): ChatSessionDTO => ({
  id: row.id,
  title: row.title,
  mode: row.mode,
  messages,
  createdAt: row.createdAt.toISOString(),
});

export function createChatService(deps: AppDeps) {
  const { db, redis } = deps;
  const buildsService = createBuildsService(deps);

  /** Row timestamps come from one clock and strictly increase per session, so ordering never ties. */
  async function nextTimestamp(sessionId: string): Promise<Date> {
    const [last] = await db
      .select({ createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);
    const floor = last ? last.createdAt.getTime() + 1 : 0;
    return new Date(Math.max(deps.now().getTime(), floor));
  }

  return {
    async createSession(who: Requester, mode: ChatMode): Promise<ChatSessionDTO> {
      const [row] = await db
        .insert(chatSessions)
        .values({
          userId: who.userId ?? null,
          guestId: who.userId ? null : (who.guestId ?? null),
          mode,
        })
        .returning();
      return toSessionDTO(row!, []);
    },

    async findSession(id: string): Promise<ChatSessionRow | null> {
      if (!isUuid(id)) return null;
      const [row] = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).limit(1);
      return row ?? null;
    },

    /** User and assistant messages, oldest first, with each reply's builds loaded from the builds table. */
    async toDTO(session: ChatSessionRow): Promise<ChatSessionDTO> {
      const rows = await db
        .select()
        .from(chatMessages)
        .where(and(eq(chatMessages.sessionId, session.id), inArray(chatMessages.role, ['user', 'assistant'])))
        .orderBy(asc(chatMessages.createdAt));
      const visible = rows.filter(isVisible);
      const ids = [...new Set(visible.flatMap((r) => r.buildIds))];
      const byId = new Map((await buildsService.getMany(ids)).map((b) => [b.id, b]));
      const messages = visible.map(
        (r): ChatMessageDTO => ({
          id: r.id,
          role: r.role,
          content: r.content,
          toolName: r.toolName,
          builds: r.buildIds.flatMap((id): BuildDTO[] => {
            const b = byId.get(id);
            return b ? [b] : [];
          }),
          createdAt: r.createdAt.toISOString(),
        }),
      );
      return toSessionDTO(session, messages);
    },

    async loadHistory(sessionId: string): Promise<LlmMessage[]> {
      const recent = await db
        .select({
          role: chatMessages.role,
          content: chatMessages.content,
          toolName: chatMessages.toolName,
          toolArgs: chatMessages.toolArgs,
          toolResult: chatMessages.toolResult,
        })
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(HISTORY_LIMIT);
      return toLlmHistory(recent.reverse() as HistoryRow[]);
    },

    async getIntent(sessionId: string): Promise<ParsedIntent | undefined> {
      const raw = await redis.get(intentKey(sessionId));
      return raw ? (JSON.parse(raw) as ParsedIntent) : undefined;
    },

    async setIntent(sessionId: string, intent: ParsedIntent): Promise<void> {
      await redis.set(intentKey(sessionId), JSON.stringify(intent), 'EX', INTENT_TTL_SECONDS);
    },

    /** Stores the user's message and names the session after the first one. */
    async addUserMessage(session: ChatSessionRow, text: string): Promise<{ id: string; createdAt: Date }> {
      const content = stripNul(text);
      const [row] = await db
        .insert(chatMessages)
        .values({ sessionId: session.id, role: 'user', content, createdAt: await nextTimestamp(session.id) })
        .returning({ id: chatMessages.id, createdAt: chatMessages.createdAt });
      const title = sessionTitle(content);
      if (title) {
        await db
          .update(chatSessions)
          .set({ title })
          .where(and(eq(chatSessions.id, session.id), isNull(chatSessions.title)));
      }
      return row!;
    },

    /**
     * One row per tool call, then the assistant reply (id = the `done` messageId); the session takes the turn's mode.
     * A turn cancelled before producing any text or build stores no reply.
     */
    async saveTurn(sessionId: string, result: RunTurnResult, latencyMs: number): Promise<void> {
      const start = (await nextTimestamp(sessionId)).getTime();
      const at = (i: number) => new Date(start + i);
      const toolRows = result.toolCalls.map((c, i) => ({
        sessionId,
        role: 'tool' as const,
        content: '',
        toolName: c.name,
        toolArgs: sanitizeJson(c.args),
        toolResult: sanitizeJson(c.response),
        buildIds: c.buildIds ?? [],
        createdAt: at(i),
      }));
      const reply = !(result.cancelled && !result.assistantText.trim() && result.buildIds.length === 0);
      const rows = [
        ...toolRows,
        ...(reply
          ? [
              {
                id: result.messageId,
                sessionId,
                role: 'assistant' as const,
                content: stripNul(result.assistantText),
                buildIds: result.buildIds,
                mode: result.mode,
                latencyMs: Math.round(latencyMs),
                createdAt: at(toolRows.length),
              },
            ]
          : []),
      ];
      if (rows.length === 0) return;
      await db.transaction(async (tx) => {
        await tx.insert(chatMessages).values(rows);
        if (reply) {
          await tx.update(chatSessions).set({ mode: result.mode }).where(eq(chatSessions.id, sessionId));
        }
      });
    },
  };
}

export type ChatService = ReturnType<typeof createChatService>;
