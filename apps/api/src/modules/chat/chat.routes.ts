import { chatMessageSchema } from '@pc/shared';
import type { Request } from 'express';
import { Router } from 'express';
import type { AppDeps } from '../../deps';
import { AppError, notFound } from '../../lib/errors';
import { handler, parseBody } from '../../lib/http';
import { enforceRateLimit, ipSubject, type RateLimitRule, visitorSubject } from '../../lib/rate-limit';
import { streamChatTurn } from './chat.controller';
import {
  CHAT_IP_RATE_LIMIT,
  CHAT_RATE_LIMIT,
  type ChatService,
  type ChatSessionRow,
  canAccessSession,
  createChatService,
  isSessionOwner,
  type Requester,
  SESSION_CREATE_IP_LIMIT,
  SESSION_CREATE_LIMIT,
} from './chat.service';
import { createToolRegistry } from './tools/registry';

const requester = (req: Request): Requester => ({
  userId: req.user?.id,
  role: req.user?.role,
  guestId: req.guestId,
});

async function loadSession(
  chat: ChatService,
  req: Request,
  access: 'read' | 'write',
): Promise<ChatSessionRow> {
  const session = await chat.findSession(String(req.params.id));
  if (!session) throw notFound('Phiên chat');
  const who = requester(req);
  if (access === 'write' && !isSessionOwner(session, who)) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không thể gửi tin vào cuộc trò chuyện này');
  }
  if (access === 'read' && !canAccessSession(session, who)) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xem phiên chat này');
  }
  return session;
}

const SESSION_LIMITS: RateLimitRule[] = [
  { scope: 'chat-session', limit: SESSION_CREATE_LIMIT, subject: visitorSubject },
  { scope: 'chat-session-ip', limit: SESSION_CREATE_IP_LIMIT, subject: ipSubject },
];
const MESSAGE_LIMITS: RateLimitRule[] = [
  { scope: 'chat', limit: CHAT_RATE_LIMIT, subject: visitorSubject },
  { scope: 'chat-ip', limit: CHAT_IP_RATE_LIMIT, subject: ipSubject },
];

export function createChatRouter(deps: AppDeps): Router {
  const router = Router();
  const chat = createChatService(deps);
  const tools = createToolRegistry(deps);

  router.post(
    '/chat/sessions',
    handler(async (req, res) => {
      await enforceRateLimit(
        deps.redis,
        req,
        res,
        SESSION_LIMITS,
        'Bạn tạo cuộc trò chuyện quá nhanh, vui lòng đợi một chút rồi thử lại',
      );
      res.status(201).json(await chat.createSession(requester(req), deps.llm ? 'AI' : 'FALLBACK'));
    }),
  );

  router.get(
    '/chat/sessions/:id',
    handler(async (req, res) => {
      res.json(await chat.toDTO(await loadSession(chat, req, 'read')));
    }),
  );

  router.post(
    '/chat/sessions/:id/messages',
    handler(async (req, res) => {
      const { text } = parseBody(chatMessageSchema, req);
      const session = await loadSession(chat, req, 'write');
      const who = requester(req);
      await enforceRateLimit(
        deps.redis,
        req,
        res,
        MESSAGE_LIMITS,
        'Bạn gửi tin nhắn quá nhanh, vui lòng đợi một chút rồi thử lại',
      );
      await streamChatTurn({ session, text, who }, res, {
        llm: deps.llm,
        tools,
        chat,
        timeoutMs: deps.env.GEMINI_TIMEOUT_MS,
        logError: (err, message) => {
          if (req.log) req.log.error({ err, sessionId: session.id }, message);
          else if (deps.env.NODE_ENV !== 'test') console.error(message, err);
        },
        logWarn: (data, message) => {
          if (req.log) req.log.warn(data, message);
          else if (deps.env.NODE_ENV !== 'test') console.warn(message, data);
        },
      });
    }),
  );

  return router;
}
