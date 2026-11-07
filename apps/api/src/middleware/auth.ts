import type { Role } from '@pc/shared';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/errors';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      guestId?: string;
    }
  }
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export function signAccessToken(user: AuthUser, secret: string): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, typ: 'access' }, secret, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

function readBearer(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}

/** Attaches req.user when a valid access token is present; never rejects. */
export function optionalAuth(secret: string): RequestHandler {
  return (req, _res, next) => {
    const token = readBearer(req.headers.authorization) ?? req.cookies?.access_token;
    if (token) {
      try {
        const p = jwt.verify(token, secret) as jwt.JwtPayload;
        if (p.typ === 'access')
          req.user = { id: String(p.sub), email: String(p.email), role: p.role as Role };
      } catch {
        // expired/invalid token behaves like anonymous; the client refreshes on 401 from protected routes
      }
    }
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập'));
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền'));
    next();
  };
}
