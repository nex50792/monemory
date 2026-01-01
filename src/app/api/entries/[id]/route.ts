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

  const updated = await prisma.entry.update({
    where: { id: entryId },
    data: {
      title: data.title ?? null,
      amount: normalizedAmount,
      date: normalizedDate,
      memo: data.memo ?? null,
    },
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
  });

  if (!entry) {
    return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
  }

  return NextResponse.json(entry);
}
