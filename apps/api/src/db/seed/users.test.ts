import { describe, expect, it } from 'vitest';
import { SEED_USERS, seedUsersFor } from './users';

const ADMIN = 'admin@pcbuilder.vn';
const strong = 'Mat-khau-that-dai-2026';

describe('seedUsersFor', () => {
  it('seeds the three demo accounts outside production', () => {
    expect(seedUsersFor({ NODE_ENV: 'development' })).toEqual(SEED_USERS);
    expect(seedUsersFor({ NODE_ENV: 'test' })).toEqual(SEED_USERS);
  });

  it('requires SEED_ADMIN_PASSWORD of at least 12 characters in production', () => {
    expect(() => seedUsersFor({ NODE_ENV: 'production' })).toThrow(/SEED_ADMIN_PASSWORD/);
    expect(() => seedUsersFor({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: 'x'.repeat(11) })).toThrow(
      /SEED_ADMIN_PASSWORD/,
    );
  });

  it('seeds only the admin, with the given password, in production', () => {
    const users = seedUsersFor({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: strong });
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: ADMIN, role: 'ADMIN', password: strong });
  });

  it('adds the staff and customer demo accounts in production only with SEED_DEMO_USERS=1', () => {
    const users = seedUsersFor({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: strong, SEED_DEMO_USERS: '1' });
    expect(users.map((u) => u.role)).toEqual(['ADMIN', 'STAFF', 'CUSTOMER']);
    expect(users.find((u) => u.role === 'ADMIN')?.password).toBe(strong);
    expect(
      seedUsersFor({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: strong, SEED_DEMO_USERS: 'true' }),
    ).toHaveLength(1);
  });
});
