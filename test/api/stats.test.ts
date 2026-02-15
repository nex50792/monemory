 
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import type { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHandler } from '../utils/fetchHandler';

let prisma: PrismaClient;

vi.mock('@/lib/getCurrentUser');

describe('api/stats', () => {
  beforeEach(async () => {
    vi.resetAllMocks();

    prisma = new PrismaClient();

    await prisma.entry.deleteMany().catch(() => {});
    await prisma.tag.deleteMany().catch(() => {});
    await prisma.category.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});

    await prisma.user.create({
      data: {
        id: 'user1',
        clerkUserId: 'clerk_user1',
        name: null,
        email: null,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const makeMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'user1',
    name: null,
    clerkUserId: 'clerk_user1',
    email: null,
    isAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  });

  it('returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(
      new Error('ログインユーザーが存在しません')
    );
    const { GET } = await import('@/app/api/stats/route');
    const { res } = await fetchHandler(GET);
    expect(res.status).toBe(401);
  });

  it('GET returns monthly stats by default', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    const jan1 = new Date('2026-01-15');
    const feb1 = new Date('2026-02-15');

    await prisma.entry.create({
      data: {
        id: 'e1',
        title: 'Entry 1',
        userId: 'user1',
        amount: 50000,
        date: jan1,
      },
    });

    await prisma.entry.create({
      data: {
        id: 'e2',
        title: 'Entry 2',
        userId: 'user1',
        amount: 30000,
        date: feb1,
      },
    });

    const { GET } = await import('@/app/api/stats/route');
    const { res, json } = await fetchHandler(GET);

    expect(res.status).toBe(200);
    expect(json).toBeDefined();
    expect(json).toHaveProperty('monthly');
    const data = json as { monthly: Array<{ month: string; total: number }> };
    expect(Array.isArray(data.monthly)).toBe(true);
    expect(data.monthly.length).toBe(2);
    expect(data.monthly[0]).toMatchObject({
      month: '2026-01',
      total: 50000,
    });
    expect(data.monthly[1]).toMatchObject({
      month: '2026-02',
      total: 30000,
    });
  });

  it('GET returns category stats when type=category', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    const category = await prisma.category.create({
      data: {
        id: 'cat1',
        name: '食費',
        userId: 'user1',
      },
    });

    await prisma.entry.create({
      data: {
        id: 'e1',
        title: 'Lunch',
        userId: 'user1',
        amount: 15000,
        date: new Date('2026-01-15'),
        categoryId: category.id,
      },
    });

    await prisma.entry.create({
      data: {
        id: 'e2',
        title: 'Dinner',
        userId: 'user1',
        amount: 8000,
        date: new Date('2026-01-20'),
        categoryId: category.id,
      },
    });

    const { GET } = await import('@/app/api/stats/route');
    const req = new Request('http://localhost/?type=category');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.byCategory).toBeDefined();
    expect(Array.isArray(json.byCategory)).toBe(true);
    expect(json.byCategory.length).toBe(1);
    expect(json.byCategory[0]).toMatchObject({
      categoryName: '食費',
      total: 23000,
      count: 2,
    });
  });

  it('handles null category (uncategorized)', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.entry.create({
      data: {
        id: 'e1',
        title: 'No Category',
        userId: 'user1',
        amount: 5000,
        date: new Date('2026-01-15'),
      },
    });

    const { GET } = await import('@/app/api/stats/route');
    const req = new Request('http://localhost/?type=category');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.byCategory[0]).toMatchObject({
      categoryName: '未分類',
      total: 5000,
      count: 1,
    });
  });

  it('filters by date range', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.entry.create({
      data: {
        id: 'e1',
        title: 'Jan Entry',
        userId: 'user1',
        amount: 10000,
        date: new Date('2026-01-15'),
      },
    });

    await prisma.entry.create({
      data: {
        id: 'e2',
        title: 'Feb Entry',
        userId: 'user1',
        amount: 20000,
        date: new Date('2026-02-15'),
      },
    });

    const { GET } = await import('@/app/api/stats/route');
    const req = new Request('http://localhost/?startDate=2026-02-01&endDate=2026-02-28');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    const data = json as { monthly: Array<{ month: string; total: number }> };
    expect(data.monthly.length).toBe(1);
    expect(data.monthly[0]).toMatchObject({
      month: '2026-02',
      total: 20000,
    });
  });

  it('returns empty array for date range with no entries', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    const { GET } = await import('@/app/api/stats/route');
    const req = new Request('http://localhost/?startDate=2026-01-01&endDate=2026-01-31');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.monthly).toEqual([]);
  });

  it('only returns stats for current user', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.entry.create({
      data: {
        id: 'e1',
        title: 'User1 Entry',
        userId: 'user1',
        amount: 10000,
        date: new Date('2026-01-15'),
      },
    });

    await prisma.user.create({
      data: {
        id: 'user2',
        clerkUserId: 'clerk_user2',
        name: null,
        email: null,
        isAdmin: false,
      },
    });

    await prisma.entry.create({
      data: {
        id: 'e2',
        title: 'User2 Entry',
        userId: 'user2',
        amount: 50000,
        date: new Date('2026-01-15'),
      },
    });

    const { GET } = await import('@/app/api/stats/route');
    const { res, json } = await fetchHandler(GET);

    expect(res.status).toBe(200);
    expect(json).toBeDefined();
    const data = json as { monthly: Array<{ month: string; total: number }> };
    expect(data.monthly.length).toBe(1);
    expect(data.monthly[0].total).toBe(10000);
  });

  it('handles decimal precision correctly', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.entry.create({
      data: {
        id: 'e1',
        title: 'Entry',
        userId: 'user1',
        amount: 123.45,
        date: new Date('2026-01-15'),
      },
    });

    const { GET } = await import('@/app/api/stats/route');
    const { res, json } = await fetchHandler(GET);

    expect(res.status).toBe(200);
    expect(json).toBeDefined();
    const data = json as { monthly: Array<{ month: string; total: number }> };
    expect(data.monthly[0].total).toBe(123.45);
  });
});
