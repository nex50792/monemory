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
      },
    });

    revalidatePath('/entries');
    revalidatePath(`/entries/${newEntry.id}`);

    return { success: true, entryId: newEntry.id };
  } catch {
    return { success: false, message: "作成に失敗しました。" };
  }
}