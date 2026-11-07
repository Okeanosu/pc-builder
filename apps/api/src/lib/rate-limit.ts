import type { Request, RequestHandler, Response } from 'express';
import { AppError } from './errors';
import { handler } from './http';
import type { Redis } from './redis';

const WINDOW_SECONDS = 60;
const GUEST_ID = /^[A-Za-z0-9_-]{10,64}$/;

/** One counter per scope and subject; requests with the same subject share `limit` per window. */
export interface RateLimitRule {
  scope: string;
  limit: number;
  subject: (req: Request) => string;
}

/** The client address; behind the one trusted proxy this is the address that proxy saw. */
export const ipSubject = (req: Request): string => `ip:${req.ip ?? 'unknown'}`;

/** Signed-in users are counted per account, guests per `gid` cookie, cookie-less clients per IP. */
export function visitorSubject(req: Request): string {
  if (req.user) return `u:${req.user.id}`;
  const gid: unknown = req.cookies?.gid;
  return typeof gid === 'string' && GUEST_ID.test(gid) ? `g:${gid}` : ipSubject(req);
}

/** Fixed window per key in one MULTI: INCR, EXPIRE NX opens the window on the first hit, TTL says when it ends. */
async function hit(redis: Redis, keys: string[]): Promise<{ count: number; ttl: number }[]> {
  const tx = redis.multi();
  for (const key of keys) tx.incr(key).expire(key, WINDOW_SECONDS, 'NX').ttl(key);
  const replies = await tx.exec();
  return keys.map((_, i) => ({
    count: Number(replies?.[i * 3]?.[1] ?? 0),
    ttl: Number(replies?.[i * 3 + 2]?.[1] ?? WINDOW_SECONDS),
  }));
}

/** Counts the request against every rule; any exhausted rule answers 429 with Retry-After. */
export async function enforceRateLimit(
  redis: Redis,
  req: Request,
  res: Response,
  rules: readonly RateLimitRule[],
  message: string,
): Promise<void> {
  const keys = rules.map((rule) => `rl:${rule.scope}:${rule.subject(req)}`);
  const hits = await hit(redis, keys);
  let retryAfter = 0;
  hits.forEach(({ count, ttl }, i) => {
    if (count > rules[i]!.limit) retryAfter = Math.max(retryAfter, ttl > 0 ? ttl : WINDOW_SECONDS);
  });
  if (retryAfter === 0) return;
  res.set('Retry-After', String(retryAfter));
  throw new AppError(429, 'RATE_LIMITED', message);
}

export function rateLimit(redis: Redis, rules: readonly RateLimitRule[], message: string): RequestHandler {
  return handler(async (req, res, next) => {
    await enforceRateLimit(redis, req, res, rules, message);
    next();
  });
}
