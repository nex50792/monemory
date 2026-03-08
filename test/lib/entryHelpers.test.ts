import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resolveCategoryId, resolveTagIds } from '@/lib/entryHelpers';

let prisma: PrismaClient;
let userId: string;

describe('entryHelpers', () => {
  beforeEach(async () => {
    prisma = new PrismaClient();
    const user = await prisma.user.create({
      data: { clerkUserId: 'clerk_helper_test', isAdmin: false },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('resolveCategoryId', () => {
    it('returns null when no category provided', async () => {
      const result = await resolveCategoryId(userId, undefined, undefined);
      expect(result).toBeNull();
    });

    it('returns null when existingCategoryId is empty string', async () => {
      const result = await resolveCategoryId(userId, '', undefined);
      expect(result).toBeNull();
    });

    it('returns existingCategoryId when provided', async () => {
      const cat = await prisma.category.create({ data: { name: 'Food', userId } });
      const result = await resolveCategoryId(userId, cat.id, undefined);
      expect(result).toBe(cat.id);
    });

    it('creates new category when newCategoryName provided', async () => {
      const result = await resolveCategoryId(userId, undefined, 'NewCat');
      expect(result).toBeTruthy();

      const cat = await prisma.category.findFirst({ where: { name: 'NewCat', userId } });
      expect(cat).toBeTruthy();
      expect(result).toBe(cat!.id);
    });

    it('reuses existing category when newCategoryName already exists', async () => {
      const existing = await prisma.category.create({ data: { name: 'Existing', userId } });
      const result = await resolveCategoryId(userId, undefined, 'Existing');
      expect(result).toBe(existing.id);
    });

    it('prefers newCategoryName over existingCategoryId', async () => {
      const oldCat = await prisma.category.create({ data: { name: 'Old', userId } });
      const result = await resolveCategoryId(userId, oldCat.id, 'Brand New');
      expect(result).not.toBe(oldCat.id);

      const newCat = await prisma.category.findFirst({ where: { name: 'Brand New', userId } });
      expect(result).toBe(newCat!.id);
    });

    it('ignores whitespace-only newCategoryName', async () => {
      const result = await resolveCategoryId(userId, undefined, '   ');
      expect(result).toBeNull();
    });
  });

  describe('resolveTagIds', () => {
    it('returns selectedTagIds when no new tags', async () => {
      const result = await resolveTagIds(userId, ['tag1', 'tag2'], []);
      expect(result).toEqual(['tag1', 'tag2']);
    });

    it('creates new tags and merges with selected', async () => {
      const existing = await prisma.tag.create({ data: { name: 'existing', userId } });
      const result = await resolveTagIds(userId, [existing.id], ['newTag']);
      expect(result).toHaveLength(2);
      expect(result).toContain(existing.id);

      const newTag = await prisma.tag.findFirst({ where: { name: 'newTag', userId } });
      expect(newTag).toBeTruthy();
      expect(result).toContain(newTag!.id);
    });

    it('reuses existing tag by name instead of creating duplicate', async () => {
      const existing = await prisma.tag.create({ data: { name: 'reuse', userId } });
      const result = await resolveTagIds(userId, [], ['reuse']);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(existing.id);
    });

    it('returns empty array when no tags', async () => {
      const result = await resolveTagIds(userId, [], []);
      expect(result).toEqual([]);
    });
  });
});
