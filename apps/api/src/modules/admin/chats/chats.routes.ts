import { CHAT_MODES, type ChatLogDetailDTO, type ChatLogSummaryDTO, type Paginated } from '@pc/shared';
import { asc, count, desc, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { chatMessages, chatSessions, users } from '../../../db/schema';
import type { AppDeps } from '../../../deps';
import { notFound } from '../../../lib/errors';
import { handler, parseQuery } from '../../../lib/http';
import { idParam, pageQuery } from '../admin.shared';

const listQuery = pageQuery.extend({ mode: z.enum(CHAT_MODES).optional() });

const summaryColumns = {
  s: chatSessions,
  userEmail: users.email,
  messageCount: sql<number>`(SELECT count(*)::int FROM chat_messages m WHERE m.session_id = ${chatSessions.id})`,
  lastMessageAt: sql<string | null>`(
    SELECT to_char(max(m.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    FROM chat_messages m WHERE m.session_id = ${chatSessions.id})`,
};

function toSummary(r: {
  s: typeof chatSessions.$inferSelect;
  userEmail: string | null;
  messageCount: number;
  lastMessageAt: string | null;
}): ChatLogSummaryDTO {
  return {
    id: r.s.id,
    title: r.s.title,
    mode: r.s.mode,
    userEmail: r.userEmail,
    guestId: r.s.guestId,
    messageCount: Number(r.messageCount),
    createdAt: r.s.createdAt.toISOString(),
    lastMessageAt: r.lastMessageAt,
  };
}

export function createAdminChatsRouter(deps: AppDeps): Router {
  const router = Router();
  const { db } = deps;

  router.get(
    '/chats',
    handler(async (req, res) => {
      const q = parseQuery(listQuery, req);
      const where = q.mode ? eq(chatSessions.mode, q.mode) : undefined;
      const [rows, [{ total } = { total: 0 }]] = await Promise.all([
        db
          .select(summaryColumns)
          .from(chatSessions)
          .leftJoin(users, eq(users.id, chatSessions.userId))
          .where(where)
          .orderBy(desc(chatSessions.createdAt))
          .limit(q.pageSize)
          .offset((q.page - 1) * q.pageSize),
        db.select({ total: count() }).from(chatSessions).where(where),
      ]);
      const page: Paginated<ChatLogSummaryDTO> = {
        items: rows.map(toSummary),
        page: q.page,
        pageSize: q.pageSize,
        total,
      };
      res.json(page);
    }),
  );

  router.get(
    '/chats/:id',
    handler(async (req, res) => {
      const id = idParam(req.params.id, 'Phiên chat');
      const [row] = await db
        .select(summaryColumns)
        .from(chatSessions)
        .leftJoin(users, eq(users.id, chatSessions.userId))
        .where(eq(chatSessions.id, id));
      if (!row) throw notFound('Phiên chat');
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, id))
        .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));
      const detail: ChatLogDetailDTO = {
        ...toSummary(row),
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolName: m.toolName,
          toolArgs: m.toolArgs ?? null,
          toolResult: m.toolResult ?? null,
          buildIds: m.buildIds,
          mode: m.mode,
          latencyMs: m.latencyMs,
          createdAt: m.createdAt.toISOString(),
        })),
      };
      res.json(detail);
    }),
  );

  return router;
}
