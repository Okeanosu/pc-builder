import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { chatMessages, chatSessions } from '../../../db/schema';
import { createCommerceHarness } from '../../cart/test-support';

const h = createCommerceHarness();
afterAll(() => h.close());

let staff: string;
beforeEach(async () => {
  await h.seed();
  staff = `Bearer ${await h.tokenFor('STAFF')}`;
});

async function fixture() {
  const t0 = Date.now() - 60_000;
  const [guest] = await h.deps.db
    .insert(chatSessions)
    .values({ guestId: 'guest-abc', title: 'PC gaming 25 triệu', mode: 'AI', createdAt: new Date(t0) })
    .returning();
  const [member] = await h.deps.db
    .insert(chatSessions)
    .values({
      userId: await h.userId('CUSTOMER'),
      title: 'PC văn phòng',
      mode: 'FALLBACK',
      createdAt: new Date(t0 + 1000),
    })
    .returning();
  await h.deps.db.insert(chatMessages).values([
    {
      sessionId: guest!.id,
      role: 'user',
      content: 'Tư vấn PC chơi game 25 triệu',
      createdAt: new Date(t0 + 10),
    },
    {
      sessionId: guest!.id,
      role: 'tool',
      toolName: 'recommend_builds',
      toolArgs: { budget: 25_000_000, purpose: 'gaming' },
      toolResult: { builds: 3 },
      latencyMs: 120,
      createdAt: new Date(t0 + 20),
    },
    {
      sessionId: guest!.id,
      role: 'assistant',
      content: 'Đây là 3 cấu hình phù hợp',
      buildIds: [],
      mode: 'AI',
      latencyMs: 2400,
      createdAt: new Date(t0 + 30),
    },
    { sessionId: member!.id, role: 'user', content: 'PC văn phòng 10 triệu', createdAt: new Date(t0 + 2000) },
  ]);
  return { guest: guest!, member: member! };
}

describe('admin chat log viewer', () => {
  it('lists sessions newest first with message counts and the user', async () => {
    const { guest, member } = await fixture();
    const res = await request(h.app).get('/api/admin/chats').set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items).toMatchObject([
      { id: member.id, mode: 'FALLBACK', userEmail: 'khach@pcbuilder.vn', guestId: null, messageCount: 1 },
      { id: guest.id, mode: 'AI', userEmail: null, guestId: 'guest-abc', messageCount: 3 },
    ]);
    expect(res.body.items[1].lastMessageAt).toEqual(expect.any(String));

    const onlyAi = await request(h.app).get('/api/admin/chats?mode=AI').set('Authorization', staff);
    expect(onlyAi.body.items.map((s: { id: string }) => s.id)).toEqual([guest.id]);
  });

  it('shows the full transcript including tool calls in order', async () => {
    const { guest } = await fixture();
    const res = await request(h.app).get(`/api/admin/chats/${guest.id}`).set('Authorization', staff);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: guest.id, title: 'PC gaming 25 triệu', messageCount: 3 });
    expect(res.body.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'tool', 'assistant']);
    expect(res.body.messages[1]).toMatchObject({
      toolName: 'recommend_builds',
      toolArgs: { budget: 25_000_000, purpose: 'gaming' },
      toolResult: { builds: 3 },
      latencyMs: 120,
    });

    expect((await request(h.app).get('/api/admin/chats/not-a-uuid').set('Authorization', staff)).status).toBe(
      404,
    );
    const missing = await request(h.app)
      .get('/api/admin/chats/00000000-0000-4000-8000-000000000000')
      .set('Authorization', staff);
    expect(missing.status).toBe(404);
  });
});
