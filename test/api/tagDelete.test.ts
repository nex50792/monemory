import { DELETE } from '@/app/api/tags/[id]/route';
import { UnauthorizedError } from '@/lib/errors';
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/getCurrentUser');

let prisma: PrismaClient;

describe('api/tags/[id] DELETE', () => {
  beforeEach(async () => {
    prisma = new PrismaClient();
    vi.resetAllMocks();

    const user = await prisma.user.create({
      data: { clerkUserId: 'clerk_tagdel', isAdmin: false },
    });
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(user);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deletes tag successfully', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const tag = await prisma.tag.create({ data: { name: 'ToDelete', userId: user.id } });

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: tag.id }),
    });
    expect(res.status).toBe(200);

    const deleted = await prisma.tag.findUnique({ where: { id: tag.id } });
    expect(deleted).toBeNull();
  });

  it('returns 400 when tag has entries', async () => {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('User not found');

    const tag = await prisma.tag.create({ data: { name: 'InUse', userId: user.id } });
    await prisma.entry.create({
      data: { title: 'Test', userId: user.id, tags: { connect: [{ id: tag.id }] } },
    });

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: tag.id }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when tag not found', async () => {
    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when not owner', async () => {
    const otherUser = await prisma.user.create({
      data: { clerkUserId: 'clerk_other_tag', isAdmin: false },
    });
    const tag = await prisma.tag.create({ data: { name: 'OtherTag', userId: otherUser.id } });

    const res = await DELETE(new Request('http://localhost/'), {
      params: Promise.resolve({ id: tag.id }),
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
