import { DELETE } from '@/app/api/categories/[id]/route';
import { UnauthorizedError } from '@/lib/errors';
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/getCurrentUser');

let prisma: PrismaClient;

describe('api/categories/[id] DELETE', () => {
  beforeEach(async () => {
    prisma = new PrismaClient();
    vi.resetAllMocks();

    const user = await prisma.user.create({
      data: { clerkUserId: 'clerk_catdel', isAdmin: false },
    });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(user);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deletes category successfully', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const cat = await prisma.category.create({ data: { name: 'ToDelete', userId: user.id } });

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: cat.id }),
    });
    expect(res.status).toBe(200);

    const deleted = await prisma.category.findUnique({ where: { id: cat.id } });
    expect(deleted).toBeNull();
  });

  it('returns 400 when category has entries', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const cat = await prisma.category.create({ data: { name: 'InUse', userId: user.id } });
    await prisma.entry.create({
      data: { title: 'Test', userId: user.id, categoryId: cat.id },
    });

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: cat.id }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when category not found', async () => {
    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when not owner', async () => {
    const otherUser = await prisma.user.create({
      data: { clerkUserId: 'clerk_other_cat', isAdmin: false },
    });
    const cat = await prisma.category.create({ data: { name: 'OtherCat', userId: otherUser.id } });

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: cat.id }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(new UnauthorizedError());

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: 'any' }),
    });
    expect(res.status).toBe(401);
  });
});
