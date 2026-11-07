import type { UserDTO } from '@pc/shared';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Env } from '../../config/env';
import type { Db } from '../../db/client';
import { users } from '../../db/schema';
import { AppError } from '../../lib/errors';
import type { Redis } from '../../lib/redis';
import { signAccessToken } from '../../middleware/auth';
import { REFRESH_TOKEN_TTL_SECONDS, refreshKey, signRefreshToken, verifyRefreshToken } from './auth.tokens';

const BCRYPT_COST = 10;
// Compared against when the email is unknown so both failure paths cost one bcrypt round.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', BCRYPT_COST);

type UserRow = typeof users.$inferSelect;

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: UserDTO;
}

export const toUserDTO = (u: UserRow): UserDTO => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  phone: u.phone,
  role: u.role,
});

const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
const invalidRefresh = () =>
  new AppError(401, 'INVALID_REFRESH_TOKEN', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
const emailTaken = () => new AppError(409, 'EMAIL_TAKEN', 'Email đã được sử dụng');

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

export function createAuthService(deps: { db: Db; redis: Redis; env: Env }) {
  const { db, redis, env } = deps;

  async function issueSession(user: UserRow): Promise<AuthSession> {
    const accessToken = signAccessToken(
      { id: user.id, email: user.email, role: user.role },
      env.JWT_ACCESS_SECRET,
    );
    const { token, jti } = signRefreshToken(user.id, env.JWT_REFRESH_SECRET);
    await redis.set(refreshKey(user.id, jti), '1', 'EX', REFRESH_TOKEN_TTL_SECONDS);
    return { accessToken, refreshToken: token, user: toUserDTO(user) };
  }

  async function findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(email)))
      .limit(1);
    return row;
  }

  async function findById(id: string): Promise<UserRow | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row;
  }

  return {
    async register(input: RegisterInput): Promise<AuthSession> {
      const email = normalizeEmail(input.email);
      if (await findByEmail(email)) throw emailTaken();
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
      let row: UserRow | undefined;
      try {
        [row] = await db
          .insert(users)
          .values({ email, passwordHash, fullName: input.fullName, phone: input.phone ?? null })
          .returning();
      } catch (err) {
        if (isUniqueViolation(err)) throw emailTaken();
        throw err;
      }
      return issueSession(row as UserRow);
    },

    async login(email: string, password: string): Promise<AuthSession> {
      const user = await findByEmail(email);
      const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !ok) throw invalidCredentials();
      return issueSession(user);
    },

    /** Rotates the refresh token: the presented jti is consumed atomically, so a replayed token fails. */
    async refresh(refreshToken: string | undefined): Promise<AuthSession> {
      const claims = refreshToken ? verifyRefreshToken(refreshToken, env.JWT_REFRESH_SECRET) : null;
      if (!claims) throw invalidRefresh();
      const consumed = await redis.del(refreshKey(claims.userId, claims.jti));
      if (consumed !== 1) throw invalidRefresh();
      const user = await findById(claims.userId);
      if (!user) throw invalidRefresh();
      return issueSession(user);
    },

    async logout(refreshToken: string | undefined): Promise<void> {
      const claims = refreshToken ? verifyRefreshToken(refreshToken, env.JWT_REFRESH_SECRET) : null;
      if (claims) await redis.del(refreshKey(claims.userId, claims.jti));
    },

    async me(userId: string): Promise<UserDTO> {
      const user = await findById(userId);
      if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập');
      return toUserDTO(user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
