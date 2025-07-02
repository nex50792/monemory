import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  const id = params.id;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { entries: true },
  });

  if (!category || category.userId !== user.id) {
    return NextResponse.json({ error: 'カテゴリが存在しないか、権限がありません。' }, { status: 404 });
  }

  if (category.entries.length > 0) {
    return NextResponse.json({ error: 'このカテゴリはエントリに使用されているため削除できません。' }, { status: 400 });
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
