/* eslint-disable @typescript-eslint/no-explicit-any */
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import type { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHandler } from '../utils/fetchHandler';

let prisma: PrismaClient;

vi.mock('@/lib/getCurrentUser');

describe('api/entries', () => {
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
  })

  it('GET returns entries for current user', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.entry.create({
      data: {
        id: 'e1',
        title: 'Lunch',
        userId: 'user1',
        amount: 0,
        date: new Date(),
      },
    });

    const { GET } = await import('@/app/api/entries/route');
    const { res, json } = await fetchHandler(GET);
    expect(res.status).toBe(200);
    expect(Array.isArray(json) && json.length === 1 && (json[0] as any).id === 'e1').toBe(true);
  })

  it('returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(null as any);
    const { GET } = await import('@/app/api/entries/route');
    const { res } = await fetchHandler(GET);
    expect(res.status).toBe(401);
  })

  it('returns empty array when no entries', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    const { GET } = await import('@/app/api/entries/route');
    const { res, json } = await fetchHandler(GET);
    expect(res.status).toBe(200);
    expect(json).toEqual([]);
  })

  it('GET applies filters from query params and includes relations', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.entry.create({
      data: {
        id: 'ef1',
        title: 'Lunch Filtered',
        userId: 'user1',
        amount: 150,
        date: new Date('2026-01-01'),
      },
    });
    await prisma.entry.create({
      data: {
        id: 'ef2',
        title: 'Other',
        userId: 'user1',
        amount: 50,
        date: new Date('2026-02-01'),
      },
    });

    const { GET } = await import('@/app/api/entries/route');
    const req = new Request('http://localhost/?q=Lunch&startDate=2026-01-01&endDate=2026-01-02&minAmount=100&maxAmount=200');
    const res = await GET(req);
    const text = await res.text();
    const json = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(Array.isArray(json) && json.length === 1 && json[0].id === 'ef1').toBe(true);
  })

  it('GET applies sort amount_desc with nulls last', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.entry.create({
      data: { id: 'es1', title: 'A', userId: 'user1', amount: null, date: new Date() },
    });
    await prisma.entry.create({
      data: { id: 'es2', title: 'B', userId: 'user1', amount: 300, date: new Date() },
    });
    await prisma.entry.create({
      data: { id: 'es3', title: 'C', userId: 'user1', amount: 100, date: new Date() },
    });

    const { GET } = await import('@/app/api/entries/route');
    const req = new Request('http://localhost/?sort=amount_desc');
    const res = await GET(req);
    const text = await res.text();
    const json = JSON.parse(text) as any[];

    expect(res.status).toBe(200);
    expect(json.map((e: any) => e.id)).toEqual(['es2', 'es3', 'es1']);
  })

  it('GET applies sort amount_asc with nulls first', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.entry.create({
      data: { id: 'esa1', title: 'A', userId: 'user1', amount: null, date: new Date() },
    });
    await prisma.entry.create({
      data: { id: 'esa2', title: 'B', userId: 'user1', amount: 300, date: new Date() },
    });
    await prisma.entry.create({
      data: { id: 'esa3', title: 'C', userId: 'user1', amount: 100, date: new Date() },
    });

    const { GET } = await import('@/app/api/entries/route');
    const req = new Request('http://localhost/?sort=amount_asc');
    const res = await GET(req);
    const text = await res.text();
    const json = JSON.parse(text) as any[];

    expect(res.status).toBe(200);
    expect(json.map((e: any) => e.id)).toEqual(['esa1', 'esa3', 'esa2']);
  })

  it('GET applies categoryId filter', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.category.create({
      data: { id: 'cat1', name: 'Cat', userId: 'user1' },
    });
    await prisma.entry.create({
      data: {
        id: 'ec1',
        title: 'ByCategory',
        userId: 'user1',
        categoryId: 'cat1',
        amount: 0,
        date: new Date(),
      },
    });

    const { GET } = await import('@/app/api/entries/route');
    const req = new Request('http://localhost/?categoryId=cat1');
    const res = await GET(req);
    const text = await res.text();
    const json = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(Array.isArray(json) && json.length === 1 && json[0].id === 'ec1').toBe(true);
  })

  it('GET applies tagIds filter (comma separated)', async () => {
    const mockUser = makeMockUser({ id: 'user1' });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(mockUser);

    await prisma.tag.create({
      data: { id: 'tag1', name: 'T1', userId: 'user1' },
    });
    await prisma.tag.create({
      data: { id: 'tag2', name: 'T2', userId: 'user1' },
    });
    await prisma.entry.create({
      data: {
        id: 'et1',
        title: 'ByTags',
        userId: 'user1',
        amount: 0,
        date: new Date(),
        tags: { connect: [{ id: 'tag1' }, { id: 'tag2' }] },
      },
    });

    const { GET } = await import('@/app/api/entries/route');
    const req = new Request('http://localhost/?tagIds=tag1,tag2');
    const res = await GET(req);
    const text = await res.text();
    const json = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(Array.isArray(json) && json.length === 1 && json[0].id === 'et1').toBe(true);
  });
});
