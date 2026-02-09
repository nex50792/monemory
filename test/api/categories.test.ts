import * as getCurrentUserMod from '@/lib/getCurrentUser';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHandler } from '../utils/fetchHandler';

vi.mock('@/lib/getCurrentUser');

let prisma: PrismaClient;

describe('api/categories', () => {
  beforeEach(async () => {
    prisma = new PrismaClient();
    vi.resetAllMocks();

    const user = await prisma.user.create({
      data: {
        clerkUserId: 'clerk_user1',
        isAdmin: false,
      },
    });

    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(user);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET returns categories for current user', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    await prisma.category.create({
      data: {
        name: 'Food',
        userId: user.id,
      },
    });

    const { GET } = await import('@/app/api/categories/route');
    const { res, json } = await fetchHandler(GET);

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    if (!Array.isArray(json)) throw new Error('Expected array');
    expect(json).toHaveLength(1);
    expect((json[0] as Record<string, unknown>).name).toBe('Food');
    expect((json[0] as Record<string, unknown>).userId).toBe(user.id);
  });

  it('POST creates category', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const { POST } = await import('@/app/api/categories/route');
    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Travel' });

    expect(res.status).toBe(200);
    if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Expected object');
    expect(json.name).toBe('Travel');
    expect(json.userId).toBe(user.id);

    const created = await prisma.category.findUnique({ where: { id: json.id as string } });
    expect(created).toBeTruthy();
    expect(created?.name).toBe('Travel');
  });

  it('POST returns 400 for empty name', async () => {
    const { POST } = await import('@/app/api/categories/route');
    const { res } = await fetchHandler((req) => POST(req), 'POST', { name: '' });

    expect(res.status).toBe(400);
  });

  it('POST returns 409 for duplicate name', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    await prisma.category.create({
      data: {
        name: 'Food',
        userId: user.id,
      },
    });

    const { POST } = await import('@/app/api/categories/route');
    const { res, json } = await fetchHandler((req) => POST(req), 'POST', { name: 'Food' });

    expect(res.status).toBe(409);
    if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Expected object');
    expect(json).toHaveProperty('error');
  });
});
