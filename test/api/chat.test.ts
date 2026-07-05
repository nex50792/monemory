/* eslint-disable @typescript-eslint/no-explicit-any */
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import { UnauthorizedError } from '@/lib/errors';
import type { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/getCurrentUser');

const mockChatWithTools = vi.fn();

vi.mock('@/lib/gemini', () => ({
  chatWithTools: mockChatWithTools,
  generateEmbedding: vi.fn(),
  GeminiOverloadedError: class GeminiOverloadedError extends Error {},
}));

let prisma: PrismaClient;

const USER_ID = 'user_chat_test';

const makeMockUser = (overrides: Partial<User> = {}): User => ({
  id: USER_ID,
  name: null,
  clerkUserId: 'clerk_chat_test',
  email: null,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

async function seedUser() {
  await prisma.user.create({
    data: {
      id: USER_ID,
      clerkUserId: 'clerk_chat_test',
      isAdmin: false,
    },
  });
}

async function readSseStream(res: Response): Promise<string[]> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value));
  }
  const raw = chunks.join('');
  return raw
    .split('\n\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

describe('api/chat', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(
      new UnauthorizedError(),
    );

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hi' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when message is empty', async () => {
    await seedUser();
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('streams response as SSE and passes system summary with tools to LLM', async () => {
    await seedUser();
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );
    mockChatWithTools.mockImplementationOnce(async function* () {
      yield 'こん';
      yield 'にちは';
    });

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '今月の合計は?' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const events = await readSseStream(res);
    const dataLines = events.filter((e) => e.startsWith('data:'));
    expect(dataLines.length).toBeGreaterThanOrEqual(2);

    expect(mockChatWithTools).toHaveBeenCalled();
    const [messages, toolDeclarations, executor] =
      mockChatWithTools.mock.calls[0];
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('家計簿AIアシスタント');
    expect(messages[messages.length - 1].content).toContain('今月の合計は?');
    expect(toolDeclarations.map((t: any) => t.name)).toEqual(
      expect.arrayContaining(['search_entries', 'get_expense_stats']),
    );
    expect(typeof executor).toBe('function');
  });

  it('persists user and assistant messages to DB', async () => {
    await seedUser();
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );
    mockChatWithTools.mockImplementationOnce(async function* () {
      yield 'Answer ';
      yield 'text';
    });

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '質問1' }),
    });
    const res = await POST(req);
    await readSseStream(res);

    const stored = await prisma.chatMessage.findMany({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'asc' },
    });
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({ role: 'user', content: '質問1' });
    expect(stored[1]).toMatchObject({
      role: 'assistant',
      content: 'Answer text',
    });
  });

  it('returns 429 with Retry-After when rate limit exceeded', async () => {
    await seedUser();
    for (let i = 0; i < 20; i++) {
      await prisma.rateLimitRecord.create({
        data: { userId: USER_ID, action: 'chat' },
      });
    }
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );
    mockChatWithTools.mockImplementationOnce(async function* () {
      yield 'never';
    });

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'q' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(mockChatWithTools).not.toHaveBeenCalled();
  });

  it('includes sliding window history in LLM context', async () => {
    await seedUser();
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );
    for (let i = 0; i < 12; i++) {
      await prisma.chatMessage.create({
        data: {
          userId: USER_ID,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `msg${i}`,
          createdAt: new Date(Date.now() - (12 - i) * 1000),
        },
      });
    }
    mockChatWithTools.mockImplementationOnce(async function* () {
      yield 'ok';
    });

    const { POST } = await import('@/app/api/chat/route');
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '新しい質問' }),
    });
    const res = await POST(req);
    await readSseStream(res);

    const [passed] = mockChatWithTools.mock.calls[0];
    const conv = passed.filter((m: any) => m.role !== 'system');
    expect(conv.length).toBeLessThanOrEqual(10);
    expect(conv[conv.length - 1].content).toBe('新しい質問');
    expect(conv[0].content).not.toBe('msg0');
  });
});
