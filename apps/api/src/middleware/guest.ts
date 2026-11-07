import type { RequestHandler } from 'express';
import { nanoid } from 'nanoid';

const GUEST_COOKIE = 'gid';
const ONE_YEAR_MS = 365 * 24 * 3600 * 1000;

/** Anonymous visitor id used for guest carts and chat sessions. */
export function guestId(secure: boolean): RequestHandler {
  return (req, res, next) => {
    let gid: string | undefined = req.cookies?.[GUEST_COOKIE];
    if (!gid) {
      gid = nanoid(21);
      res.cookie(GUEST_COOKIE, gid, { httpOnly: true, sameSite: 'lax', secure, maxAge: ONE_YEAR_MS });
    }
    req.guestId = gid;
    next();
  };
}
