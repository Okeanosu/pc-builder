import type { AddressInfo } from 'node:net';
import type { BuildDTO, ChatEvent, ChatSessionDTO } from '@pc/shared';
import { asc, eq, inArray } from 'drizzle-orm';
import type express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDeps, redisWithFailingMulti } from '../../../test/helpers';
import { createApp } from '../../app';
import { builds, chatMessages, chatSessions } from '../../db/schema';
import { seedDatabase } from '../../db/seed';
import { CHAT_RATE_LIMIT, intentKey } from './chat.service';
import { type LlmChunk, type LlmClient, type LlmMessage, LlmUnavailableError } from './llm/types';

type Step = LlmChunk[] | Error | 'hang';

interface FakeLlm extends LlmClient {
  steps: Step[];
  calls: Array<{ history: LlmMessage[]; tools: string[] }>;
  aborted: boolean;
}

function fakeLlm(): FakeLlm {
  const fake: FakeLlm = {
    steps: [],
    calls: [],
    aborted: false,
    async *stream(input) {
      fake.calls.push({ history: structuredClone(input.history), tools: input.tools.map((t) => t.name) });
      const step = fake.steps.shift();
      if (!step) throw new Error('fake LLM script exhausted');
      if (step instanceof Error) throw step;
      if (step === 'hang') {
        await new Promise<void>((resolve) => {
          if (input.signal?.aborted) resolve();
          input.signal?.addEventListener('abort', () => resolve(), { once: true });
        });
        fake.aborted = true;
        throw new Error('aborted');
      }
      for (const chunk of step) yield chunk;
    },
  };
  return fake;
}

const text = (t: string): LlmChunk => ({ type: 'text', text: t });
const call = (name: string, args: Record<string, unknown>): LlmChunk => ({
  type: 'functionCall',
  name,
  args,
});

/** Reads the whole SSE body and returns the `data:` payloads in order. */
function sseEvents(raw: string): ChatEvent[] {
  return raw
    .split('\n\n')
    .map((block) => block.split('\n').find((line) => line.startsWith('data: ')))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line.slice(6)) as ChatEvent);
}

const rawBody = (res: NodeJS.ReadableStream, cb: (err: Error | null, body: string) => void) => {
  let data = '';
  res.setEncoding?.('utf8');
  res.on('data', (chunk: string) => {
    data += chunk;
  });
  res.on('end', () => cb(null, data));
};

const t = createTestDeps();
const { db, redis } = t.deps;
const llm = fakeLlm();
let aiApp: express.Express;
let fallbackApp: express.Express;
let userToken: string;
let staffToken: string;

async function login(app: express.Express, email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

async function send(
  agent: ReturnType<typeof request.agent>,
  sessionId: string,
  body: unknown,
  token?: string,
) {
  const req = agent.post(`/api/chat/sessions/${sessionId}/messages`).send(body as object);
  if (token) req.set('Authorization', `Bearer ${token}`);
  const res = await req.buffer(true).parse(rawBody as never);
  const isSse = String(res.headers['content-type'] ?? '').startsWith('text/event-stream');
  return { res, events: isSse ? sseEvents(res.body as string) : [] };
}

async function newSession(agent: ReturnType<typeof request.agent>, token?: string): Promise<ChatSessionDTO> {
  const req = agent.post('/api/chat/sessions');
  if (token) req.set('Authorization', `Bearer ${token}`);
  const res = await req;
  expect(res.status).toBe(201);
  return res.body as ChatSessionDTO;
}

const rowsOf = (sessionId: string) =>
  db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

beforeAll(async () => {
  await seedDatabase(db);
  await redis.flushdb();
  aiApp = createApp({ ...t.deps, llm });
  fallbackApp = createApp({ ...t.deps, llm: undefined });
  userToken = await login(aiApp, 'khach@pcbuilder.vn', 'Khach@123');
  staffToken = await login(aiApp, 'staff@pcbuilder.vn', 'Staff@123');
});
beforeEach(async () => {
  llm.steps = [];
  llm.calls = [];
  llm.aborted = false;
  // every request here comes from one address, so per-IP counters must not carry over between tests
  const counters = await redis.keys('rl:*');
  if (counters.length > 0) await redis.del(...counters);
});
afterAll(() => t.close());

describe('POST /api/chat/sessions', () => {
  it('creates an AI session owned by the guest when an LLM is configured', async () => {
    const session = await newSession(request.agent(aiApp));
    expect(session).toMatchObject({ title: null, mode: 'AI', messages: [] });
    const [row] = await db.select().from(chatSessions).where(eq(chatSessions.id, session.id));
    expect(row!.guestId).toEqual(expect.any(String));
    expect(row!.userId).toBeNull();
  });

  it('creates a FALLBACK session without an LLM, owned by the logged-in user', async () => {
    const session = await newSession(request.agent(fallbackApp), userToken);
    expect(session.mode).toBe('FALLBACK');
    const [row] = await db.select().from(chatSessions).where(eq(chatSessions.id, session.id));
    expect(row!.userId).toEqual(expect.any(String));
  });
});

describe('POST /api/chat/sessions/:id/messages — AI mode with a scripted LLM', () => {
  const agent = () => request.agent(aiApp);
  let guest: ReturnType<typeof agent>;
  let session: ChatSessionDTO;
  let events: ChatEvent[];

  beforeAll(async () => {
    guest = agent();
    session = await newSession(guest);
  });

  it('streams session → tool(start) → builds → tool(end) → tokens → done', async () => {
    llm.steps = [
      [call('recommend_builds', { budget: 25_000_000, purpose: 'gaming' })],
      [text('Đây là '), text('các cấu hình '), text('phù hợp.')],
    ];
    const sent = await send(guest, session.id, { text: 'Mình chơi game, ngân sách 25 triệu' });
    events = sent.events;
    expect(sent.res.status).toBe(200);
    expect(sent.res.headers['content-type']).toMatch(/^text\/event-stream/);
    expect(events.map((e) => e.type)).toEqual([
      'session',
      'tool',
      'builds',
      'tool',
      'token',
      'token',
      'token',
      'done',
    ]);
    expect(events[0]).toEqual({ type: 'session', sessionId: session.id, mode: 'AI' });
    expect(events[1]).toMatchObject({ type: 'tool', name: 'recommend_builds', status: 'start' });
    expect(events[3]).toMatchObject({ type: 'tool', name: 'recommend_builds', status: 'end' });
    const built = (events[2] as Extract<ChatEvent, { type: 'builds' }>).builds;
    expect(built.length).toBeGreaterThan(0);
    for (const b of built) expect(b.totalPrice).toBeLessThanOrEqual(25_000_000);
    expect(events.at(-1)).toEqual({ type: 'done', messageId: expect.any(String), mode: 'AI' });
  });

  it('persists the user message, one row per tool call and the assistant message', async () => {
    const built = (events[2] as Extract<ChatEvent, { type: 'builds' }>).builds;
    const ids = built.map((b) => b.id);
    const rows = await rowsOf(session.id);
    expect(rows.map((r) => r.role)).toEqual(['user', 'tool', 'assistant']);
    const [userRow, toolRow, assistantRow] = rows;
    expect(userRow).toMatchObject({ content: 'Mình chơi game, ngân sách 25 triệu', buildIds: [] });
    expect(toolRow).toMatchObject({
      toolName: 'recommend_builds',
      toolArgs: { budget: 25_000_000, purpose: 'gaming' },
      buildIds: ids,
    });
    expect((toolRow!.toolResult as { builds: Array<{ id: string }> }).builds.map((b) => b.id)).toEqual(ids);
    const done = events.at(-1) as Extract<ChatEvent, { type: 'done' }>;
    expect(assistantRow).toMatchObject({
      id: done.messageId,
      content: 'Đây là các cấu hình phù hợp.',
      buildIds: ids,
      mode: 'AI',
      priceCheck: { mentions: 0, unmatched: [] },
    });
    expect(assistantRow!.latencyMs).toBeGreaterThanOrEqual(0);
    const [s] = await db.select().from(chatSessions).where(eq(chatSessions.id, session.id));
    expect(s).toMatchObject({ title: 'Mình chơi game, ngân sách 25 triệu', mode: 'AI' });
    const saved = await db.select().from(builds).where(inArray(builds.id, ids));
    expect(saved.every((b) => b.source === 'CHAT' && b.userId === null)).toBe(true);
    expect(await redis.get(intentKey(session.id))).toContain('"budget":25000000');
  });

  it('records amounts the model quoted that no tool returned on the assistant row, leaving the text as is', async () => {
    const other = await newSession(guest);
    const reply = 'Dạ, card RTX 4090 bên em chỉ 9.990.000₫ thôi ạ.';
    llm.steps = [[text(reply)]];
    await send(guest, other.id, { text: 'card mạnh nhất giá bao nhiêu' });
    const assistantRow = (await rowsOf(other.id)).find((r) => r.role === 'assistant');
    expect(assistantRow).toMatchObject({
      content: reply,
      priceCheck: { mentions: 1, unmatched: [{ text: '9.990.000₫', amount: 9_990_000 }] },
    });
  });

  it('rebuilds the conversation from the stored rows on the next turn', async () => {
    llm.steps = [[text('Dạ, anh muốn rẻ hơn bao nhiêu ạ?')]];
    const { events: next } = await send(guest, session.id, { text: 'rẻ hơn chút được không' });
    expect(next.at(-1)).toMatchObject({ type: 'done', mode: 'AI' });
    const history = llm.calls[0]!.history;
    expect(history.map((m) => m.role)).toEqual(['user', 'model', 'user', 'model', 'user']);
    expect(history[0]!.parts).toEqual([{ text: 'Mình chơi game, ngân sách 25 triệu' }]);
    expect(history[1]!.parts[0]).toEqual({
      functionCall: { name: 'recommend_builds', args: { budget: 25_000_000, purpose: 'gaming' } },
    });
    expect(history[2]!.parts[0]).toMatchObject({ functionResponse: { name: 'recommend_builds' } });
    expect(history[3]!.parts).toEqual([{ text: 'Đây là các cấu hình phù hợp.' }]);
    expect(history[4]!.parts).toEqual([{ text: 'rẻ hơn chút được không' }]);
    expect(llm.calls[0]!.tools).toHaveLength(5);
  });

  it('GET returns user and assistant messages with hydrated builds to the owner and staff only', async () => {
    const res = await guest.get(`/api/chat/sessions/${session.id}`);
    expect(res.status).toBe(200);
    const dto = res.body as ChatSessionDTO;
    expect(dto).toMatchObject({ id: session.id, title: 'Mình chơi game, ngân sách 25 triệu', mode: 'AI' });
    expect(dto.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    const reply = dto.messages[1]!;
    expect(reply.content).toBe('Đây là các cấu hình phù hợp.');
    expect(reply.builds.length).toBeGreaterThan(0);
    const first = reply.builds[0] as BuildDTO;
    expect(first.items.length).toBeGreaterThan(0);
    expect(first.items[0]!.product.name).toEqual(expect.any(String));
    expect(dto.messages[0]!.builds).toEqual([]);

    expect((await agent().get(`/api/chat/sessions/${session.id}`)).status).toBe(403);
    expect(
      (await agent().get(`/api/chat/sessions/${session.id}`).set('Authorization', `Bearer ${staffToken}`))
        .status,
    ).toBe(200);
  });

  it('answers 404 for unknown or malformed ids and 403 for another visitor, before any stream', async () => {
    expect((await guest.get('/api/chat/sessions/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await guest.get('/api/chat/sessions/not-a-uuid')).status).toBe(404);
    const stranger = await send(agent(), session.id, { text: 'xin chào' });
    expect(stranger.res.status).toBe(403);
    expect(stranger.res.headers['content-type']).toMatch(/json/);
    const missing = await send(guest, '00000000-0000-4000-8000-000000000000', { text: 'xin chào' });
    expect(missing.res.status).toBe(404);
    const invalid = await send(guest, session.id, { text: '   ' });
    expect(invalid.res.status).toBe(422);
  });

  it('keeps a logged-in user session private to that user', async () => {
    const owner = agent();
    const mine = await newSession(owner, userToken);
    expect(
      (await owner.get(`/api/chat/sessions/${mine.id}`).set('Authorization', `Bearer ${userToken}`)).status,
    ).toBe(200);
    expect((await agent().get(`/api/chat/sessions/${mine.id}`)).status).toBe(403);
  });

  it('records FALLBACK as the session mode when the LLM is rate limited', async () => {
    const s = await newSession(guest);
    llm.steps = [new LlmUnavailableError('RATE_LIMIT')];
    const { events: ev } = await send(guest, s.id, { text: 'chơi game 25 triệu' });
    expect(ev[0]).toMatchObject({ type: 'session', mode: 'AI' });
    expect(ev.some((e) => e.type === 'builds')).toBe(true);
    expect(ev.at(-1)).toMatchObject({ type: 'done', mode: 'FALLBACK' });
    const [row] = await db.select().from(chatSessions).where(eq(chatSessions.id, s.id));
    expect(row!.mode).toBe('FALLBACK');
  });

  it('cancels the turn on disconnect, keeps only the user message, and the next turn still alternates roles', async () => {
    const created = await request(aiApp).post('/api/chat/sessions');
    const s = created.body as ChatSessionDTO;
    const setCookie = ([] as string[]).concat(created.headers['set-cookie'] ?? []);
    const gid = setCookie.map((c) => c.split(';')[0]).join('; ');
    const post = (body: object) =>
      request(aiApp)
        .post(`/api/chat/sessions/${s.id}/messages`)
        .set('Cookie', gid)
        .send(body)
        .buffer(true)
        .parse(rawBody as never);

    llm.steps = [[call('search_products', { category: 'gpu' })], [text('Có mấy mẫu card đây ạ.')]];
    expect((await post({ text: 'có card nào không' })).status).toBe(200);

    llm.steps = ['hang'];
    const server = aiApp.listen(0);
    try {
      const { port } = server.address() as AddressInfo;
      const controller = new AbortController();
      const res = await fetch(`http://127.0.0.1:${port}/api/chat/sessions/${s.id}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: gid },
        body: JSON.stringify({ text: 'chơi game 25 triệu' }),
        signal: controller.signal,
      });
      expect(res.status).toBe(200);
      const reader = res.body!.getReader();
      const first = new TextDecoder().decode((await reader.read()).value);
      expect(first).toContain('"type":"session"');
      controller.abort();
      const deadline = Date.now() + 5000;
      while (!llm.aborted && Date.now() < deadline) await new Promise((r) => setTimeout(r, 20));
      await new Promise((r) => setTimeout(r, 300));
    } finally {
      server.close();
    }
    expect(llm.aborted).toBe(true);
    const rows = await rowsOf(s.id);
    expect(rows.map((r) => r.role)).toEqual(['user', 'tool', 'assistant', 'user']);
    expect(rows[3]!.content).toBe('chơi game 25 triệu');

    llm.calls = [];
    llm.steps = [[text('Dạ, em đây.')]];
    expect((await post({ text: 'alo, còn đó không' })).status).toBe(200);
    const history = llm.calls[0]!.history;
    const roles = history.map((m) => m.role);
    expect(roles).toEqual(['user', 'model', 'user', 'model', 'user']);
    for (let i = 1; i < roles.length; i++) expect(roles[i]).not.toBe(roles[i - 1]);
    history.forEach((m, i) => {
      if (m.parts.some((p) => 'functionCall' in p)) {
        expect(history[i + 1]!.parts.some((p) => 'functionResponse' in p)).toBe(true);
      }
    });
    expect(history.at(-1)!.parts).toEqual([{ text: 'chơi game 25 triệu' }, { text: 'alo, còn đó không' }]);
  });

  it('GET leaves out empty assistant rows', async () => {
    const s = await newSession(guest);
    llm.steps = [[text('Dạ, chào anh.')]];
    await send(guest, s.id, { text: 'chào shop' });
    await db.insert(chatMessages).values({
      sessionId: s.id,
      role: 'assistant',
      content: '',
      mode: 'AI',
      createdAt: new Date(Date.now() + 60_000),
    });
    const dto = (await guest.get(`/api/chat/sessions/${s.id}`)).body as ChatSessionDTO;
    expect(dto.messages.map((m) => [m.role, m.content])).toEqual([
      ['user', 'chào shop'],
      ['assistant', 'Dạ, chào anh.'],
    ]);
  });

  it('lets staff read but not write into a customer session', async () => {
    const before = await rowsOf(session.id);
    const staff = agent();
    const sent = await send(staff, session.id, { text: 'nhân viên chen vào' }, staffToken);
    expect(sent.res.status).toBe(403);
    expect(sent.res.headers['content-type']).toMatch(/json/);
    expect(JSON.parse(sent.res.body as string)).toMatchObject({
      error: { code: 'FORBIDDEN', message: 'Bạn không thể gửi tin vào cuộc trò chuyện này' },
    });
    expect(await rowsOf(session.id)).toHaveLength(before.length);
    const [s] = await db.select().from(chatSessions).where(eq(chatSessions.id, session.id));
    expect(s!.mode).toBe('AI');
    expect(
      (await staff.get(`/api/chat/sessions/${session.id}`).set('Authorization', `Bearer ${staffToken}`))
        .status,
    ).toBe(200);
  });
});

describe('POST /api/chat/sessions/:id/messages — fallback mode (no LLM)', () => {
  it('"chơi game 25 triệu" → builds event and done{mode:FALLBACK}, persisted as FALLBACK', async () => {
    const guest = request.agent(fallbackApp);
    const session = await newSession(guest);
    const { res, events } = await send(guest, session.id, { text: 'chơi game 25 triệu' });
    expect(res.status).toBe(200);
    expect(events[0]).toEqual({ type: 'session', sessionId: session.id, mode: 'FALLBACK' });
    const types = events.map((e) => e.type);
    expect(types).toContain('builds');
    expect(types.indexOf('builds')).toBeLessThan(types.indexOf('token'));
    expect(events.at(-1)).toMatchObject({ type: 'done', mode: 'FALLBACK' });
    const reply = events
      .filter((e): e is Extract<ChatEvent, { type: 'token' }> => e.type === 'token')
      .map((e) => e.text)
      .join('');
    expect(reply).toMatch(/₫/);
    const rows = await rowsOf(session.id);
    expect(rows.map((r) => r.role)).toEqual(['user', 'tool', 'assistant']);
    expect(rows[2]).toMatchObject({ mode: 'FALLBACK', content: reply, priceCheck: null });
    const [s] = await db.select().from(chatSessions).where(eq(chatSessions.id, session.id));
    expect(s!.mode).toBe('FALLBACK');
  });

  it('asks one question when budget and purpose are missing', async () => {
    const guest = request.agent(fallbackApp);
    const session = await newSession(guest);
    const { events } = await send(guest, session.id, { text: 'xin chào shop' });
    expect(events.map((e) => e.type)).not.toContain('builds');
    expect(events.at(-1)).toMatchObject({ type: 'done', mode: 'FALLBACK' });
  });

  it('truncates the session title to 60 characters', async () => {
    const guest = request.agent(fallbackApp);
    const session = await newSession(guest);
    const long = `Mình cần một bộ máy ${'rất '.repeat(30)}mạnh`;
    await send(guest, session.id, { text: long });
    const [s] = await db.select().from(chatSessions).where(eq(chatSessions.id, session.id));
    const chars = Array.from(s!.title!).length;
    expect(chars).toBeLessThanOrEqual(60);
    expect(chars).toBeGreaterThanOrEqual(55);
    expect(long.startsWith(s!.title!)).toBe(true);
  });
});

describe('chat rate limit', () => {
  it('allows 10 new sessions per minute per visitor, keyed by IP for cookie-less clients', async () => {
    const fixed = new Date('2026-11-07T11:00:10Z');
    const app = createApp({ ...t.deps, llm: undefined, now: () => fixed });
    const guest = request.agent(app);
    await guest.get('/api/health');
    for (let i = 0; i < 10; i++) expect((await guest.post('/api/chat/sessions')).status).toBe(201);
    const limited = await guest.post('/api/chat/sessions');
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);

    for (let i = 0; i < 10; i++) expect((await request(app).post('/api/chat/sessions')).status).toBe(201);
    expect((await request(app).post('/api/chat/sessions')).status).toBe(429);
    expect(
      (await request(app).post('/api/chat/sessions').set('Authorization', `Bearer ${userToken}`)).status,
    ).toBe(201);
  });

  it(`allows ${CHAT_RATE_LIMIT} messages per minute and answers the next with 429 JSON before streaming`, async () => {
    const fixed = new Date('2026-11-07T10:00:30Z');
    const app = createApp({ ...t.deps, llm: undefined, now: () => fixed });
    const guest = request.agent(app);
    const session = await newSession(guest);
    for (let i = 0; i < CHAT_RATE_LIMIT; i++) {
      const { res } = await send(guest, session.id, { text: 'xin chào' });
      expect(res.status).toBe(200);
    }
    const { res } = await send(guest, session.id, { text: 'xin chào' });
    expect(res.status).toBe(429);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(JSON.parse(res.body as string)).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    const rows = await rowsOf(session.id);
    expect(rows.filter((r) => r.role === 'user')).toHaveLength(CHAT_RATE_LIMIT);

    const other = request.agent(app);
    const otherSession = await newSession(other);
    expect((await send(other, otherSession.id, { text: 'xin chào' })).res.status).toBe(200);
  });

  const createFrom = (ip: string, gid: string) =>
    request(fallbackApp).post('/api/chat/sessions').set('X-Forwarded-For', ip).set('Cookie', `gid=${gid}`);
  const messageFrom = (ip: string, s: { id: string; gid: string }) =>
    request(fallbackApp)
      .post(`/api/chat/sessions/${s.id}/messages`)
      .set('X-Forwarded-For', ip)
      .set('Cookie', `gid=${s.gid}`)
      .send({ text: 'xin chào' })
      .buffer(true)
      .parse(rawBody as never);

  it('caps one IP at 30 new sessions per minute, however often the guest cookie changes', async () => {
    for (let i = 0; i < 30; i++) {
      expect((await createFrom('203.0.113.7', `rotating-${i}-aaaaaaaaaa`)).status).toBe(201);
    }
    const limited = await createFrom('203.0.113.7', 'rotating-new-aaaaaaaaaa');
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect((await createFrom('198.51.100.9', 'rotating-new-aaaaaaaaaa')).status).toBe(201);
  });

  it('caps one IP at 40 messages per minute across guests, and counts each IP separately', async () => {
    const sessions: { id: string; gid: string }[] = [];
    for (let g = 0; g < 5; g++) {
      const gid = `msg-guest-${g}-aaaaaaaaaa`;
      const created = await createFrom('203.0.113.8', gid);
      expect(created.status).toBe(201);
      sessions.push({ id: (created.body as ChatSessionDTO).id, gid });
    }
    for (const s of sessions) {
      for (let i = 0; i < 8; i++) expect((await messageFrom('203.0.113.8', s)).status).toBe(200);
    }
    const limited = await messageFrom('203.0.113.8', sessions[0]!);
    expect(limited.status).toBe(429);
    expect(JSON.parse(limited.body as string)).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    expect((await messageFrom('198.51.100.9', sessions[1]!)).status).toBe(200);
  });

  it('creates the session and logs a warning when a command inside the rate-limit MULTI fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const broken = createApp({
        ...t.deps,
        llm: undefined,
        redis: redisWithFailingMulti(redis, 'reply-error'),
      });
      expect((await request(broken).post('/api/chat/sessions')).status).toBe(201);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('rate limit'), expect.any(Error));
    } finally {
      warn.mockRestore();
    }
  });

  it('lets sessions and messages through and logs a warning when the rate-limit store fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const broken = createApp({ ...t.deps, llm: undefined, redis: redisWithFailingMulti(redis) });
      const guest = request.agent(broken);
      const session = await newSession(guest);
      const { res, events } = await send(guest, session.id, { text: 'xin chào' });
      expect(res.status).toBe(200);
      expect(events.at(-1)).toMatchObject({ type: 'done', mode: 'FALLBACK' });
      const limiterWarnings = warn.mock.calls.filter(([msg]) => String(msg).includes('rate limit'));
      expect(limiterWarnings).toHaveLength(2);
    } finally {
      warn.mockRestore();
    }
  });
});
