import path from 'node:path';

/** Ports and stores reserved for the E2E run; override with E2E_* variables when they clash. */
export const API_PORT = Number(process.env.E2E_API_PORT ?? 4104);
export const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3104);
export const DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgres://pc:pc@localhost:5433/pcbuilder_e2e';
export const REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://localhost:6380/7';

export const API_URL = `http://localhost:${API_PORT}/api`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

export const ADMIN = { email: 'admin@pcbuilder.vn', password: 'Admin@123' };
export const ADMIN_STATE = path.join(__dirname, '.auth', 'admin.json');
