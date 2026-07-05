/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSearchRelevantEntries = vi.fn();

vi.mock('@/lib/chatRetrieval', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/chatRetrieval')
  >('@/lib/chatRetrieval');
  return {
    ...actual,
    searchRelevantEntries: mockSearchRelevantEntries,
  };
});

let prisma: PrismaClient;
const USER_ID = 'user_tools_test';

async function seedUser() {
  await prisma.user.create({
    data: {
      id: USER_ID,
      clerkUserId: 'clerk_tools',
      isAdmin: false,
    },
  });
}

describe('lib/chatTools', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('search_entries', () => {
    it('calls searchRelevantEntries and formats results', async () => {
      await seedUser();
      mockSearchRelevantEntries.mockResolvedValueOnce([
        {
          id: 'e1',
          title: 'ランチ',
          amount: 1200,
          memo: null,
          date: new Date('2026-06-01'),
          categoryName: '食費',
        },
      ]);

      const { createChatToolExecutor } = await import('@/lib/chatTools');
      const executor = createChatToolExecutor(USER_ID);
      const result: any = await executor('search_entries', {
        query: '先月のランチ',
        limit: 3,
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject({
        id: 'e1',
        title: 'ランチ',
        amount: 1200,
        date: '2026-06-01',
        category: '食費',
      });
      expect(mockSearchRelevantEntries).toHaveBeenCalledWith(
        USER_ID,
        '先月のランチ',
        3,
      );
    });

    it('clamps limit to [1, 20]', async () => {
      await seedUser();
      mockSearchRelevantEntries.mockResolvedValue([]);
      const { createChatToolExecutor } = await import('@/lib/chatTools');
      const executor = createChatToolExecutor(USER_ID);
      await executor('search_entries', { query: 'q', limit: 100 });
      await executor('search_entries', { query: 'q', limit: -1 });
      await executor('search_entries', { query: 'q' });
      expect(mockSearchRelevantEntries).toHaveBeenNthCalledWith(1, USER_ID, 'q', 20);
      expect(mockSearchRelevantEntries).toHaveBeenNthCalledWith(2, USER_ID, 'q', 1);
      expect(mockSearchRelevantEntries).toHaveBeenNthCalledWith(3, USER_ID, 'q', 5);
    });

    it('returns error when query missing', async () => {
      await seedUser();
      const { createChatToolExecutor } = await import('@/lib/chatTools');
      const executor = createChatToolExecutor(USER_ID);
      const result: any = await executor('search_entries', {});
      expect(result.error).toBeDefined();
    });
  });

  describe('get_expense_stats', () => {
    it('returns total amount and count when groupBy=none', async () => {
      await seedUser();
      await prisma.entry.create({
        data: { userId: USER_ID, title: 'A', amount: 1000, date: new Date('2026-06-01') },
      });
      await prisma.entry.create({
        data: { userId: USER_ID, title: 'B', amount: 2000, date: new Date('2026-06-15') },
      });

      const { createChatToolExecutor } = await import('@/lib/chatTools');
      const executor = createChatToolExecutor(USER_ID);
      const result: any = await executor('get_expense_stats', { groupBy: 'none' });

      expect(result.groupBy).toBe('none');
      expect(result.totalAmount).toBe(3000);
      expect(result.entryCount).toBe(2);
    });

    it('filters by date range', async () => {
      await seedUser();
      await prisma.entry.create({
        data: { userId: USER_ID, title: 'in', amount: 500, date: new Date('2026-06-15') },
      });
      await prisma.entry.create({
        data: { userId: USER_ID, title: 'out', amount: 999, date: new Date('2026-07-15') },
      });

      const { createChatToolExecutor } = await import('@/lib/chatTools');
      const executor = createChatToolExecutor(USER_ID);
      const result: any = await executor('get_expense_stats', {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(result.totalAmount).toBe(500);
      expect(result.entryCount).toBe(1);
    });

    it('groups by category', async () => {
      await seedUser();
      const cat = await prisma.category.create({
        data: { name: '食費', userId: USER_ID },
      });
      await prisma.entry.create({
        data: {
          userId: USER_ID,
          title: 'A',
          amount: 1000,
          categoryId: cat.id,
          date: new Date('2026-06-01'),
        },
      });
      await prisma.entry.create({
        data: {
          userId: USER_ID,
          title: 'B',
          amount: 500,
          date: new Date('2026-06-15'),
        },
      });

      const { createChatToolExecutor } = await import('@/lib/chatTools');
      const executor = createChatToolExecutor(USER_ID);
      const result: any = await executor('get_expense_stats', { groupBy: 'category' });

      expect(result.groupBy).toBe('category');
      const foodGroup = result.groups.find((g: any) => g.category === '食費');
      const noneGroup = result.groups.find((g: any) => g.category === 'カテゴリなし');
      expect(foodGroup.totalAmount).toBe(1000);
      expect(noneGroup.totalAmount).toBe(500);
    });

    it('groups by month', async () => {
      await seedUser();
      await prisma.entry.create({
        data: { userId: USER_ID, title: 'A', amount: 100, date: new Date('2026-05-15') },
      });
      await prisma.entry.create({
        data: { userId: USER_ID, title: 'B', amount: 200, date: new Date('2026-06-01') },
      });
      await prisma.entry.create({
        data: { userId: USER_ID, title: 'C', amount: 300, date: new Date('2026-06-20') },
      });

      const { createChatToolExecutor } = await import('@/lib/chatTools');
      const executor = createChatToolExecutor(USER_ID);
      const result: any = await executor('get_expense_stats', { groupBy: 'month' });

      expect(result.groupBy).toBe('month');
      expect(result.groups).toEqual([
        { month: '2026-05', totalAmount: 100, entryCount: 1 },
        { month: '2026-06', totalAmount: 500, entryCount: 2 },
      ]);
    });

    it('scopes to the user (does not leak other users data)', async () => {
      await seedUser();
      await prisma.user.create({
        data: { id: 'other', clerkUserId: 'clerk_other_x', isAdmin: false },
      });
      await prisma.entry.create({
        data: { userId: USER_ID, title: 'mine', amount: 1, date: new Date() },
      });
      await prisma.entry.create({
        data: { userId: 'other', title: 'theirs', amount: 9999, date: new Date() },
      });

      const { createChatToolExecutor } = await import('@/lib/chatTools');
      const executor = createChatToolExecutor(USER_ID);
      const result: any = await executor('get_expense_stats', {});
      expect(result.totalAmount).toBe(1);
      expect(result.entryCount).toBe(1);
    });
  });

  it('returns error for unknown tool name', async () => {
    await seedUser();
    const { createChatToolExecutor } = await import('@/lib/chatTools');
    const executor = createChatToolExecutor(USER_ID);
    const result: any = await executor('unknown_tool', {});
    expect(result.error).toContain('unknown tool');
  });
});
