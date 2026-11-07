process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgres://pc:pc@localhost:5433/pcbuilder_test';
process.env.REDIS_URL = process.env.REDIS_URL_TEST ?? 'redis://localhost:6380/1';
process.env.GEMINI_API_KEY = '';
