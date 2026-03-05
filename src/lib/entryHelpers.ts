import { prisma } from '@/lib/prisma';

export async function resolveCategoryId(
  userId: string,
  existingCategoryId: string | undefined,
  newCategoryName: string | undefined,
): Promise<string | null> {
  if (newCategoryName && newCategoryName.trim() !== '') {
    const category = await prisma.category.upsert({
      where: { name_userId: { name: newCategoryName.trim(), userId } },
      update: {},
      create: { name: newCategoryName.trim(), userId },
    });
    return category.id;
  }
  return existingCategoryId || null;
}

export async function resolveTagIds(
  userId: string,
  selectedTagIds: string[],
  newTagNames: string[],
): Promise<string[]> {
  const createdTags = await Promise.all(
    newTagNames.map(async (name) => {
      const existing = await prisma.tag.findFirst({ where: { name, userId } });
      if (existing) return existing;
      return prisma.tag.create({ data: { name, userId } });
    }),
  );

  return [...selectedTagIds, ...createdTags.map((t) => t.id)];
}
