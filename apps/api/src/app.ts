import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { AppDeps } from './deps';
import { errorHandler, notFoundHandler } from './lib/errors';
import { optionalAuth } from './middleware/auth';
import { guestId } from './middleware/guest';
import { createApiRouter } from './routes';

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  const isProd = deps.env.NODE_ENV === 'production';
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: deps.env.WEB_ORIGIN.split(','), credentials: true }));
  if (deps.env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ redact: ['req.headers.authorization', 'req.headers.cookie'] }));
  }
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(guestId(isProd));
  app.use(optionalAuth(deps.env.JWT_ACCESS_SECRET));
  app.use('/api', createApiRouter(deps));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
