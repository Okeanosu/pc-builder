import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgres://pc:pc@localhost:5433/pcbuilder_test';
process.env.REDIS_URL = process.env.REDIS_URL_TEST ?? 'redis://localhost:6380/1';
process.env.GEMINI_API_KEY = '';

// Node ≥19 makes the global agent keep sockets alive. supertest starts and closes a server per request,
// so a pooled socket can point at a server that is already gone and the next request fails with
// "socket hang up". One connection per request keeps the integration tests deterministic.
http.globalAgent = new http.Agent({ keepAlive: false });
