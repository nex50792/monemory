import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateEmbedding = vi.fn();

vi.mock('@/lib/gemini', () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

let prisma: PrismaClient;

async function insertEntryWithEmbedding(
  id: string,
  userId: string,
  title: string,
  vec: number[],
) {
  await prisma.entry.create({
    data: { id, userId, title },
  });
  const literal = `[${vec.join(',')}]`;
  await prisma.$executeRaw`
    UPDATE "Entry" SET embedding = ${literal}::vector WHERE id = ${id}
  `;
}

describe('lib/chatRetrieval', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    await prisma.user.create({
      data: { id: 'u_ret1', clerkUserId: 'clerk_ret1', isAdmin: false },
    });
    await prisma.user.create({
      data: { id: 'u_ret2', clerkUserId: 'clerk_ret2', isAdmin: false },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('searchRelevantEntries', () => {
    it('returns entries ordered by cosine similarity to query embedding', async () => {
      const dim = 1536;
      const queryVec = new Array(dim).fill(0);
      queryVec[0] = 1;
      mockGenerateEmbedding.mockResolvedValueOnce(queryVec);

      const closeVec = [...queryVec];
      const farVec = new Array(dim).fill(0);
      farVec[100] = 1;
      const midVec = new Array(dim).fill(0);
      midVec[0] = 0.5;
      midVec[100] = 0.5;

      await insertEntryWithEmbedding('e_close', 'u_ret1', 'ランチ', closeVec);
      await insertEntryWithEmbedding('e_far', 'u_ret1', '書籍', farVec);
      await insertEntryWithEmbedding('e_mid', 'u_ret1', 'カフェ', midVec);

      const { searchRelevantEntries } = await import('@/lib/chatRetrieval');
      const results = await searchRelevantEntries('u_ret1', 'ランチ何食べた', 3);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('e_close');
      expect(results[results.length - 1].id).toBe('e_far');
    });

    it('excludes other users entries (RLS boundary via userId filter)', async () => {
      const dim = 1536;
      const queryVec = new Array(dim).fill(0);
      queryVec[0] = 1;
      mockGenerateEmbedding.mockResolvedValueOnce(queryVec);

      await insertEntryWithEmbedding('e_mine', 'u_ret1', 'ランチ', queryVec);
      await insertEntryWithEmbedding('e_theirs', 'u_ret2', 'ランチ他人', queryVec);

      const { searchRelevantEntries } = await import('@/lib/chatRetrieval');
      const results = await searchRelevantEntries('u_ret1', 'ランチ', 10);

      expect(results.map((r) => r.id)).toEqual(['e_mine']);
    });

    it('skips entries with null embedding', async () => {
      const dim = 1536;
      mockGenerateEmbedding.mockResolvedValueOnce(new Array(dim).fill(1));

      await insertEntryWithEmbedding(
        'e_hasvec',
        'u_ret1',
        'あり',
        new Array(dim).fill(1),
      );
      await prisma.entry.create({
        data: { id: 'e_novec', userId: 'u_ret1', title: 'なし' },
      });

      const { searchRelevantEntries } = await import('@/lib/chatRetrieval');
      const results = await searchRelevantEntries('u_ret1', 'test', 10);

      expect(results.map((r) => r.id)).toEqual(['e_hasvec']);
    });

    it('respects limit', async () => {
      const dim = 1536;
      mockGenerateEmbedding.mockResolvedValueOnce(new Array(dim).fill(1));

      for (let i = 0; i < 5; i++) {
        await insertEntryWithEmbedding(
          `e_l${i}`,
          'u_ret1',
          `item${i}`,
          new Array(dim).fill(1),
        );
      }

      const { searchRelevantEntries } = await import('@/lib/chatRetrieval');
      const results = await searchRelevantEntries('u_ret1', 'q', 2);

      expect(results).toHaveLength(2);
    });
  });

  describe('buildContextSummary', () => {
    it('includes entry count, categories, date range, and current date', async () => {
      await prisma.category.create({ data: { name: '食費', userId: 'u_ret1' } });
      await prisma.category.create({ data: { name: '交通費', userId: 'u_ret1' } });
      await prisma.entry.create({
        data: {
          userId: 'u_ret1',
          title: 'A',
          amount: 100,
          date: new Date('2026-05-01'),
        },
      });
      await prisma.entry.create({
        data: {
          userId: 'u_ret1',
          title: 'B',
          amount: 200,
          date: new Date('2026-06-15'),
        },
      });

      const { buildContextSummary } = await import('@/lib/chatRetrieval');
      const summary = await buildContextSummary('u_ret1');

      expect(summary).toContain('総記録件数: 2件');
      expect(summary).toContain('カテゴリ数: 2件');
      expect(summary).toContain('食費');
      expect(summary).toContain('交通費');
      expect(summary).toContain('2026-05-01');
      expect(summary).toContain('2026-06-15');
      expect(summary).toContain('現在の日付');
    });

    it('scopes to the user (does not count other users data)', async () => {
      await prisma.category.create({ data: { name: 'mine', userId: 'u_ret1' } });
      await prisma.category.create({ data: { name: 'theirs', userId: 'u_ret2' } });

      const { buildContextSummary } = await import('@/lib/chatRetrieval');
      const summary = await buildContextSummary('u_ret1');
      expect(summary).toContain('mine');
      expect(summary).not.toContain('theirs');
    });

    it('handles empty state gracefully (0件, "なし", "不明")', async () => {
      const { buildContextSummary } = await import('@/lib/chatRetrieval');
      const summary = await buildContextSummary('u_ret1');
      expect(summary).toContain('総記録件数: 0件');
      expect(summary).toContain('カテゴリ数: 0件 (なし)');
      expect(summary).toContain('不明');
    });
  });

  describe('buildRagSystemPrompt', () => {
    it('embeds the summary and lists tools', async () => {
      const { buildRagSystemPrompt } = await import('@/lib/chatRetrieval');
      const prompt = buildRagSystemPrompt('SUMMARY_BLOCK');
      expect(prompt).toContain('SUMMARY_BLOCK');
      expect(prompt).toContain('search_entries');
      expect(prompt).toContain('get_expense_stats');
      expect(prompt).toContain('家計簿');
    });
  });
});
