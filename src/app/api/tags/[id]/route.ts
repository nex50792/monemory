import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const id = (await params).id;

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: { entries: true },
  });

  if (!tag || tag.userId !== user.id) {
    return NextResponse.json({ error: 'タグが存在しないか、権限がありません。' }, { status: 404 });
  }

  if (tag.entries.length > 0) {
    return NextResponse.json({ error: 'このタグは記録に使用されているため削除できません。' }, { status: 400 });
  }

  await prisma.tag.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
