import { changePasswordSchema, loginSchema, registerSchema } from '@pc/shared';
import { type RequestHandler, Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AppDeps } from '../../deps';
import { AppError } from '../../lib/errors';
import { handler, parseBody } from '../../lib/http';
import { ipSubject, rateLimit as redisRateLimit } from '../../lib/rate-limit';
import { requireAuth } from '../../middleware/auth';
import { createAuthService, InvalidRefreshError } from './auth.service';
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from './auth.tokens';

export interface AuthRouterOptions {
  /** Defaults to on everywhere except NODE_ENV=test, where a test opts in explicitly. */
  loginRateLimit?: boolean;
  /** Same default as `loginRateLimit`. */
  registerRateLimit?: boolean;
}

export const REGISTER_IP_RATE_LIMIT = 5;

function loginLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(
        new AppError(
          429,
          'TOO_MANY_REQUESTS',
          'Bạn đã thử đăng nhập quá nhiều lần, vui lòng thử lại sau 1 phút',
        ),
      ),
  });
}

export function createAuthRouter(deps: AppDeps, opts: AuthRouterOptions = {}): Router {
  const router = Router();
  const auth = createAuthService(deps);
  const secure = deps.env.NODE_ENV === 'production';
  const limitLogin = opts.loginRateLimit ?? deps.env.NODE_ENV !== 'test';
  const limitRegister = opts.registerRateLimit ?? deps.env.NODE_ENV !== 'test';
  const passThrough: RequestHandler = (_req, _res, next) => next();
  const registerLimiter = redisRateLimit(
    deps.redis,
    [{ scope: 'register-ip', limit: REGISTER_IP_RATE_LIMIT, subject: ipSubject }],
    'Bạn đã tạo tài khoản quá nhiều lần, vui lòng thử lại sau 1 phút',
  );

  router.post(
    '/auth/register',
    limitRegister ? registerLimiter : passThrough,
    handler(async (req, res) => {
      const session = await auth.register(parseBody(registerSchema, req));
      setAuthCookies(res, session, secure);
      res.status(201).json({ accessToken: session.accessToken, user: session.user });
    }),
  );

  router.post(
    '/auth/login',
    limitLogin ? loginLimiter() : passThrough,
    handler(async (req, res) => {
      const { email, password } = parseBody(loginSchema, req);
      const session = await auth.login(email, password);
      setAuthCookies(res, session, secure);
      res.json({ accessToken: session.accessToken, user: session.user });
    }),
  );

  router.post(
    '/auth/refresh',
    handler(async (req, res) => {
      try {
        const session = await auth.refresh(req.cookies?.[REFRESH_COOKIE]);
        setAuthCookies(res, session, secure);
        res.json({ accessToken: session.accessToken, user: session.user });
      } catch (err) {
        if (err instanceof InvalidRefreshError && err.clearCookies) clearAuthCookies(res, secure);
        throw err;
      }
    }),
  );

  router.post(
    '/auth/logout',
    handler(async (req, res) => {
      await auth.logout(req.cookies?.[REFRESH_COOKIE]);
      clearAuthCookies(res, secure);
      res.status(204).end();
    }),
  );

  router.post(
    '/auth/password',
    requireAuth,
    handler(async (req, res) => {
      const { currentPassword, newPassword } = parseBody(changePasswordSchema, req);
      const session = await auth.changePassword(req.user!.id, currentPassword, newPassword);
      setAuthCookies(res, session, secure);
      res.json({ accessToken: session.accessToken, user: session.user });
    }),
  );

  router.get(
    '/auth/me',
    requireAuth,
    handler(async (req, res) => {
      res.json(await auth.me(req.user!.id));
    }),
  );

  return router;
}

export { type AuthService, createAuthService, InvalidRefreshError, toUserDTO } from './auth.service';
