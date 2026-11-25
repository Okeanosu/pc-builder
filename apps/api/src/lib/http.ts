import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

/** Express 5 forwards rejected promises to the error handler; this only adds typing. */
export const handler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown): RequestHandler =>
  async (req, res, next) => {
    await fn(req, res, next);
  };

export const parseBody = <T extends z.ZodType>(schema: T, req: Request): z.infer<T> => schema.parse(req.body);
export const parseQuery = <T extends z.ZodType>(schema: T, req: Request): z.infer<T> =>
  schema.parse(req.query);
