import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const entryId = (await params).id;
  const data = await req.json();

  const entry = await prisma.entry.findUnique({
    where: { id: entryId, userId: user.id },
    include: {
      tags: true,
    },
  });

  if (!entry) {
    return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
  }

  // Normalize fields to avoid passing invalid values to Prisma
  const normalizedDate = data.date && typeof data.date === 'string' && data.date.trim() !== '' && !isNaN(Date.parse(data.date))
    ? new Date(data.date)
    : null;

  const normalizedAmount = data.amount === '' || data.amount === null || data.amount === undefined
    ? null
    : data.amount;

  let categoryId: string | null = null;
  const existingCategoryId = data.categoryId as string | undefined;
  const newCategoryName = data.newCategory as string | undefined;
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

  const rawSelectedTagIds = data.tags as string | string[] | undefined;
  const selectedTagIds = typeof rawSelectedTagIds === 'string'
    ? rawSelectedTagIds.split(',').map((t) => t.trim()).filter(Boolean)
    : Array.isArray(rawSelectedTagIds)
      ? rawSelectedTagIds.map((t) => String(t).trim()).filter(Boolean)
      : [];

  const newTagsRaw: string[] = Array.isArray(data.newTags) ? data.newTags : (data.newTags ? [data.newTags] : []);
  const newTagNames: string[] = newTagsRaw
    .flatMap((v: string) => (typeof v === 'string' ? v.split(',') : []))
    .map((t: string) => t.trim())
    .filter(Boolean) as string[];

  const createdTags = await Promise.all(
    newTagNames.map(async (name: string) => {
      const existing = await prisma.tag.findFirst({ where: { name, userId: user.id } });
      if (existing) return existing;
      return prisma.tag.create({ data: { name, userId: user.id } });
    })
  );

  const allTagIds = [
    ...selectedTagIds,
    ...createdTags.map((t) => t.id),
  ];

  const updated = await prisma.entry.update({
    where: { id: entryId },
    data: {
      title: data.title ?? null,
      amount: normalizedAmount,
      date: normalizedDate,
      memo: data.memo ?? null,
      categoryId,
      tags: { set: allTagIds.map((id) => ({ id })) },
    },
    include: { tags: true, category: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const entryId = (await params).id;

  const entry = await prisma.entry.findUnique({
    where: { id: entryId, userId: user.id },
  });

  if (!entry || entry.userId !== user.id) {
    return NextResponse.json(
      { error: 'エントリが存在しないか、権限がありません。' },
      { status: 404 }
    );
  }

  await prisma.entry.delete({
    where: { id: entryId },
  });

  return NextResponse.json({ success: true });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const entryId = (await params).id;

  const entry = await prisma.entry.findUnique({
    where: { id: entryId, userId: user.id },
    include: {
      tags: true,
    },
  });

  if (!entry) {
    return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
  }

  return NextResponse.json(entry);
}
