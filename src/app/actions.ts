"use server";

import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createEntry(formData: FormData) {
  const user = await getCurrentUser();

  const title = formData.get("title") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const dateRaw = formData.get("date") as string;
  const date = dateRaw ? new Date(dateRaw) : undefined;
  const memo = formData.get("memo") as string;

  const existingCategoryId = formData.get("categoryId") as string;
  const newCategoryName = formData.get("newCategory") as string;

  let categoryId: string | null = null;

  if (newCategoryName && newCategoryName.trim() !== '') {
    const category = await prisma.category.upsert({
      where: { name_userId: { name: newCategoryName, userId: user.id } },
      update: {},
      create: { name: newCategoryName, userId: user.id },
    });
    categoryId = category.id;
  } else if (existingCategoryId) {
    categoryId = existingCategoryId;
  }

  const rawSelectedTagIds = formData.get("tags") as string;
  const selectedTagIds = rawSelectedTagIds
    ? rawSelectedTagIds.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const newTagsRaw = formData.getAll("newTags");
  const newTagNames = newTagsRaw
    .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
    .map((t) => t.trim())
    .filter(Boolean);

  const createdTags = await Promise.all(
    newTagNames.map(async (name) => {
      const existing = await prisma.tag.findFirst({
        where: { name, userId: user.id },
      });
      if (existing) return existing;
      return await prisma.tag.create({ data: { name, userId: user.id } });
    })
  );

  const allTagIds = [
    ...selectedTagIds,
    ...createdTags.map((tag) => tag.id),
  ];

  if (!title || title.trim() === '') {
    return { success: false, message: "タイトルは必須です。" };
  }

  try {
    const newEntry = await prisma.entry.create({
      data: {
        userId: user.id,
        title,
        amount,
        date,
        memo,
        categoryId,
        tags: {
          connect: allTagIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath('/entries');
    revalidatePath(`/entries/${newEntry.id}`);

    return { success: true, entryId: newEntry.id };
  } catch (error) {
    console.error('エントリ作成中にエラー:', error);
    return { success: false, message: "作成に失敗しました。" };
  }
}

export async function getCategoriesAPI(userId: string) {
  return await prisma.category.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

export async function getTagsAPI(userId: string) {
  return await prisma.tag.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}
