import { randomUUID } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_TTL_SECONDS } from '../../middleware/auth';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600;
const REFRESH_COOKIE_PATH = '/api/auth';

export const refreshKey = (userId: string, jti: string) => `rt:${userId}:${jti}`;

export interface RefreshClaims {
  userId: string;
  jti: string;
}

export function signRefreshToken(userId: string, secret: string): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti }, secret, { expiresIn: REFRESH_TOKEN_TTL_SECONDS });
  return { token, jti };
}

/** Null for anything that is not an unexpired refresh token signed by us. */
export function verifyRefreshToken(token: string, secret: string): RefreshClaims | null {
  try {
    const p = jwt.verify(token, secret) as jwt.JwtPayload;
    if (typeof p.sub !== 'string' || typeof p.jti !== 'string') return null;
    return { userId: p.sub, jti: p.jti };
  } catch {
    return null;
  }
}

const baseCookie = (secure: boolean): CookieOptions => ({ httpOnly: true, sameSite: 'lax', secure });

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  secure: boolean,
): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookie(secure),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookie(secure),
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response, secure: boolean): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(secure), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(secure), path: REFRESH_COOKIE_PATH });
}
