import type { Request, RequestHandler } from 'express';
import { AppError } from '../../lib/errors';
import { handler } from '../../lib/http';
import type { Redis } from '../../lib/redis';

export const RECOMMENDATION_RATE_LIMIT = 20;
const WINDOW_SECONDS = 60;
const GUEST_ID = /^[A-Za-z0-9_-]{10,64}$/;

/** Signed-in users are counted per account, guests per `gid` cookie, cookie-less clients per IP. */
export function rateLimitSubject(req: Request): string {
  if (req.user) return `u:${req.user.id}`;
  const gid: unknown = req.cookies?.gid;
  return typeof gid === 'string' && GUEST_ID.test(gid) ? `g:${gid}` : `ip:${req.ip}`;
}

export function recommendationRateLimit(redis: Redis): RequestHandler {
  return handler(async (req, res, next) => {
    const key = `rl:reco:${rateLimitSubject(req)}`;
    const replies = await redis.multi().incr(key).expire(key, WINDOW_SECONDS, 'NX').ttl(key).exec();
    const count = Number(replies?.[0]?.[1] ?? 0);
    if (count > RECOMMENDATION_RATE_LIMIT) {
      const ttl = Number(replies?.[2]?.[1] ?? WINDOW_SECONDS);
      res.set('Retry-After', String(ttl > 0 ? ttl : WINDOW_SECONDS));
      throw new AppError(429, 'RATE_LIMITED', 'Bạn yêu cầu gợi ý quá nhanh, vui lòng thử lại sau ít phút');
    }
    next();
  });
}
