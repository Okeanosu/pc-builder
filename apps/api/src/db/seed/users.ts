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

export async function buildUserRows() {
  return Promise.all(
    SEED_USERS.map(async ({ password, ...user }) => ({
      ...user,
      passwordHash: await bcrypt.hash(password, 10),
    })),
  );
}
