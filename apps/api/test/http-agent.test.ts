import http from 'node:http';
import { expect, it } from 'vitest';

it('every API test file runs with keep-alive off on the global HTTP agent', () => {
  expect((http.globalAgent as unknown as { keepAlive: boolean }).keepAlive).toBe(false);
});
