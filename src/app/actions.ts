"use server";

import { resolveCategoryId, resolveTagIds } from '@/lib/entryHelpers';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createEntry(formData: FormData) {
  const user = await getCurrentUser();

  const title = formData.get("title") as string;

  if (!title || title.trim() === '') {
    return { success: false, message: "タイトルは必須です。" };
  }

  const amount = parseFloat(formData.get("amount") as string);
  const dateRaw = formData.get("date") as string;
  const date = dateRaw ? new Date(dateRaw) : undefined;
  const memo = formData.get("memo") as string;

  const categoryId = await resolveCategoryId(
    user.id,
    formData.get("categoryId") as string,
    formData.get("newCategory") as string,
  );

  const rawSelectedTagIds = formData.get("tags") as string;
  const selectedTagIds = rawSelectedTagIds
    ? rawSelectedTagIds.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  const newTagsRaw = formData.getAll("newTags");
  const newTagNames = newTagsRaw
    .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
    .map((t) => t.trim())
    .filter(Boolean);

  const allTagIds = await resolveTagIds(user.id, selectedTagIds, newTagNames);

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
    console.error('記録作成中にエラー:', error);
    return { success: false, message: "作成に失敗しました。" };
  }
}
