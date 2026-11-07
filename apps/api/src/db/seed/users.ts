import bcrypt from 'bcryptjs';

export interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER';
}

export const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@pcbuilder.vn',
    password: 'Admin@123',
    fullName: 'Quản trị viên',
    phone: '0900000001',
    role: 'ADMIN',
  },
  {
    email: 'staff@pcbuilder.vn',
    password: 'Staff@123',
    fullName: 'Nhân viên cửa hàng',
    phone: '0900000002',
    role: 'STAFF',
  },
  {
    email: 'khach@pcbuilder.vn',
    password: 'Khach@123',
    fullName: 'Nguyễn Văn Khách',
    phone: '0900000003',
    role: 'CUSTOMER',
  },
];

export const MIN_SEED_ADMIN_PASSWORD_LENGTH = 12;

export interface SeedUserEnv {
  NODE_ENV?: string;
  SEED_ADMIN_PASSWORD?: string;
  SEED_DEMO_USERS?: string;
}

/**
 * The demo accounts have published passwords, so production seeds only the admin, with SEED_ADMIN_PASSWORD;
 * the staff and customer demo accounts are added there only when SEED_DEMO_USERS=1.
 */
export function seedUsersFor(source: SeedUserEnv): SeedUser[] {
  if (source.NODE_ENV !== 'production') return SEED_USERS;
  const password = source.SEED_ADMIN_PASSWORD ?? '';
  if (password.length < MIN_SEED_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD (at least ${MIN_SEED_ADMIN_PASSWORD_LENGTH} characters) is required to seed in production`,
    );
  }
  return SEED_USERS.flatMap((u) => {
    if (u.role === 'ADMIN') return [{ ...u, password }];
    return source.SEED_DEMO_USERS === '1' ? [u] : [];
  });
}

export async function buildUserRows(source: SeedUserEnv = process.env) {
  return Promise.all(
    seedUsersFor(source).map(async ({ password, ...user }) => ({
      ...user,
      passwordHash: await bcrypt.hash(password, 10),
    })),
  );
}
