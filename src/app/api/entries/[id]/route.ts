import { resolveCategoryId, resolveTagIds } from '@/lib/entryHelpers';
import { UnauthorizedError } from '@/lib/errors';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const entryId = (await params).id;
    const data = await req.json();

    const entry = await prisma.entry.findUnique({
      where: { id: entryId, userId: user.id },
    });

    if (!entry) {
      return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
    }

    const normalizedDate = data.date && typeof data.date === 'string' && data.date.trim() !== '' && !isNaN(Date.parse(data.date))
      ? new Date(data.date)
      : null;

    const normalizedAmount = data.amount === '' || data.amount === null || data.amount === undefined
      ? null
      : data.amount;

    const categoryId = await resolveCategoryId(user.id, data.categoryId, data.newCategory);

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

    const allTagIds = await resolveTagIds(user.id, selectedTagIds, newTagNames);

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
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Entry update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const entryId = (await params).id;

    const entry = await prisma.entry.findUnique({
      where: { id: entryId, userId: user.id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: '記録が存在しないか、権限がありません。' },
        { status: 404 }
      );
    }

    await prisma.entry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Entry delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const entryId = (await params).id;

    const entry = await prisma.entry.findUnique({
      where: { id: entryId, userId: user.id },
      include: {
        tags: true,
        category: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Entry detail error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
