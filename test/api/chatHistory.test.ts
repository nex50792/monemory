/* eslint-disable @typescript-eslint/no-explicit-any */
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import { UnauthorizedError } from '@/lib/errors';
import type { User } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/getCurrentUser');

let prisma: PrismaClient;
const USER_ID = 'user_history_test';

const makeMockUser = (): User => ({
  id: USER_ID,
  name: null,
  clerkUserId: 'clerk_history_test',
  email: null,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

async function seedUser() {
  await prisma.user.create({
    data: {
      id: USER_ID,
      clerkUserId: 'clerk_history_test',
      isAdmin: false,
    },
  });
}

describe('api/chat/history', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(
        new UnauthorizedError(),
      );
      const { GET } = await import('@/app/api/chat/history/route');
      const res = await GET(new Request('http://localhost/'));
      expect(res.status).toBe(401);
    });

    it('returns messages in chronological order', async () => {
      await seedUser();
      vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
        makeMockUser(),
      );

      const base = Date.now();
      for (let i = 0; i < 3; i++) {
        await prisma.chatMessage.create({
          data: {
            userId: USER_ID,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `msg${i}`,
            createdAt: new Date(base + i * 1000),
          },
        });
      }

      const { GET } = await import('@/app/api/chat/history/route');
      const res = await GET(new Request('http://localhost/'));
      const json = (await res.json()) as any[];

      expect(res.status).toBe(200);
      expect(json.map((m: any) => m.content)).toEqual([
        'msg0',
        'msg1',
        'msg2',
      ]);
    });

    it('scopes messages to the authenticated user', async () => {
      await seedUser();
      await prisma.user.create({
        data: {
          id: 'other_user',
          clerkUserId: 'clerk_other',
          isAdmin: false,
        },
      });
      vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
        makeMockUser(),
      );
      await prisma.chatMessage.create({
        data: { userId: USER_ID, role: 'user', content: 'mine' },
      });
      await prisma.chatMessage.create({
        data: { userId: 'other_user', role: 'user', content: 'theirs' },
      });

      const { GET } = await import('@/app/api/chat/history/route');
      const res = await GET(new Request('http://localhost/'));
      const json = (await res.json()) as any[];
      expect(json.map((m: any) => m.content)).toEqual(['mine']);
    });

    it('respects limit query parameter (returns latest N in chronological order)', async () => {
      await seedUser();
      vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
        makeMockUser(),
      );
      const base = Date.now();
      for (let i = 0; i < 5; i++) {
        await prisma.chatMessage.create({
          data: {
            userId: USER_ID,
            role: 'user',
            content: `m${i}`,
            createdAt: new Date(base + i * 1000),
          },
        });
      }

      const { GET } = await import('@/app/api/chat/history/route');
      const res = await GET(new Request('http://localhost/?limit=2'));
      const json = (await res.json()) as any[];
      expect(json.map((m: any) => m.content)).toEqual(['m3', 'm4']);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(
        new UnauthorizedError(),
      );
      const { DELETE } = await import('@/app/api/chat/history/route');
      const res = await DELETE();
      expect(res.status).toBe(401);
    });

    it('deletes only the current user messages', async () => {
      await seedUser();
      await prisma.user.create({
        data: {
          id: 'other_user2',
          clerkUserId: 'clerk_other2',
          isAdmin: false,
        },
      });
      vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
        makeMockUser(),
      );
      await prisma.chatMessage.create({
        data: { userId: USER_ID, role: 'user', content: 'mine1' },
      });
      await prisma.chatMessage.create({
        data: { userId: USER_ID, role: 'assistant', content: 'mine2' },
      });
      await prisma.chatMessage.create({
        data: { userId: 'other_user2', role: 'user', content: 'theirs' },
      });

      const { DELETE } = await import('@/app/api/chat/history/route');
      const res = await DELETE();
      expect(res.status).toBe(200);

      const mine = await prisma.chatMessage.findMany({
        where: { userId: USER_ID },
      });
      expect(mine).toHaveLength(0);
      const theirs = await prisma.chatMessage.findMany({
        where: { userId: 'other_user2' },
      });
      expect(theirs).toHaveLength(1);
    });
  });
});
