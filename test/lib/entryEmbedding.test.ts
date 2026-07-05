import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateEmbedding = vi.fn();

vi.mock('@/lib/gemini', () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

let prisma: PrismaClient;

describe('lib/entryEmbedding', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    await prisma.user.create({
      data: {
        id: 'u_emb1',
        clerkUserId: 'clerk_emb1',
        isAdmin: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('buildEmbeddingText', () => {
    it('joins title + memo + category name + tag names with newlines', async () => {
      const { buildEmbeddingText } = await import('@/lib/entryEmbedding');
      const text = buildEmbeddingText({
        title: 'ランチ',
        memo: '同僚と',
        category: { name: '食費' },
        tags: [{ name: 'lunch' }, { name: 'friday' }],
      });
      expect(text).toContain('ランチ');
      expect(text).toContain('同僚と');
      expect(text).toContain('食費');
      expect(text).toContain('lunch');
      expect(text).toContain('friday');
    });

    it('handles null memo and null category', async () => {
      const { buildEmbeddingText } = await import('@/lib/entryEmbedding');
      const text = buildEmbeddingText({
        title: 'カフェ',
        memo: null,
        category: null,
        tags: [],
      });
      expect(text).toContain('カフェ');
      expect(text).not.toContain('null');
    });
  });

  describe('syncEntryEmbedding', () => {
    it('generates embedding and saves to DB', async () => {
      const fakeVec = new Array(1536).fill(0.5);
      mockGenerateEmbedding.mockResolvedValueOnce(fakeVec);

      const entry = await prisma.entry.create({
        data: {
          id: 'e_emb1',
          userId: 'u_emb1',
          title: 'ランチ',
          memo: '同僚と',
        },
      });

      const { syncEntryEmbedding } = await import('@/lib/entryEmbedding');
      await syncEntryEmbedding(entry.id);

      const rows = await prisma.$queryRaw<Array<{ has_embedding: boolean }>>`
        SELECT (embedding IS NOT NULL) AS has_embedding
        FROM "Entry" WHERE id = ${entry.id}
      `;
      expect(rows[0]?.has_embedding).toBe(true);
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1);
      const input = mockGenerateEmbedding.mock.calls[0][0];
      expect(input).toContain('ランチ');
      expect(input).toContain('同僚と');
    });

    it('silently no-ops when entry does not exist', async () => {
      const { syncEntryEmbedding } = await import('@/lib/entryEmbedding');
      await expect(syncEntryEmbedding('nonexistent')).resolves.toBeUndefined();
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it('does not throw when embedding generation fails (logs and continues)', async () => {
      mockGenerateEmbedding.mockRejectedValueOnce(new Error('OpenAI down'));

      const entry = await prisma.entry.create({
        data: {
          id: 'e_emb2',
          userId: 'u_emb1',
          title: 'カフェ',
        },
      });

      const { syncEntryEmbedding } = await import('@/lib/entryEmbedding');
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(syncEntryEmbedding(entry.id)).resolves.toBeUndefined();
      expect(errSpy).toHaveBeenCalled();

      const rows = await prisma.$queryRaw<Array<{ has_embedding: boolean }>>`
        SELECT (embedding IS NOT NULL) AS has_embedding
        FROM "Entry" WHERE id = ${entry.id}
      `;
      expect(rows[0]?.has_embedding).toBe(false);
    });
  });
});
