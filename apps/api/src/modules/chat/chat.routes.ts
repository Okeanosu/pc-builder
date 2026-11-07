import { chatMessageSchema } from '@pc/shared';
import { type Request, Router } from 'express';
import type { AppDeps } from '../../deps';
import { AppError, notFound } from '../../lib/errors';
import { handler, parseBody } from '../../lib/http';
import { streamChatTurn } from './chat.controller';
import {
  type ChatService,
  type ChatSessionRow,
  canAccessSession,
  createChatService,
  type Requester,
} from './chat.service';
import { createToolRegistry } from './tools/registry';

const requester = (req: Request): Requester => ({
  userId: req.user?.id,
  role: req.user?.role,
  guestId: req.guestId,
});

async function ownedSession(chat: ChatService, req: Request): Promise<ChatSessionRow> {
  const session = await chat.findSession(String(req.params.id));
  if (!session) throw notFound('Phiên chat');
  if (!canAccessSession(session, requester(req))) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem phiên chat này');
  }
  return session;
}

export function createChatRouter(deps: AppDeps): Router {
  const router = Router();
  const chat = createChatService(deps);
  const tools = createToolRegistry(deps);

  router.post(
    '/chat/sessions',
    handler(async (req, res) => {
      res.status(201).json(await chat.createSession(requester(req), deps.llm ? 'AI' : 'FALLBACK'));
    }),
  );

  router.get(
    '/chat/sessions/:id',
    handler(async (req, res) => {
      res.json(await chat.toDTO(await ownedSession(chat, req)));
    }),
  );

  router.post(
    '/chat/sessions/:id/messages',
    handler(async (req, res) => {
      const { text } = parseBody(chatMessageSchema, req);
      const session = await ownedSession(chat, req);
      const who = requester(req);
      const limit = await chat.consumeRateLimit(who);
      if (!limit.allowed) {
        res.set('Retry-After', String(limit.retryAfterSeconds));
        throw new AppError(
          429,
          'RATE_LIMITED',
          'Bạn gửi tin nhắn quá nhanh, vui lòng đợi một chút rồi thử lại',
        );
      }
      await streamChatTurn({ session, text, who }, res, {
        llm: deps.llm,
        tools,
        chat,
        timeoutMs: deps.env.GEMINI_TIMEOUT_MS,
        logError: (err, message) => {
          if (req.log) req.log.error({ err, sessionId: session.id }, message);
          else if (deps.env.NODE_ENV !== 'test') console.error(message, err);
        },
      });
    }),
  );

  return router;
}
