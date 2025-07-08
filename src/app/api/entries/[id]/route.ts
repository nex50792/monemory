import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

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
