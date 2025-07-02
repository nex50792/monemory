import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await getCurrentUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });
  return Response.json(categories);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { name } = await req.json();

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'カテゴリ名を入力してください。' }, { status: 400 });
  }

  const trimmedName = name.trim();

  const existing = await prisma.category.findUnique({
    where: { name_userId: { name: trimmedName, userId: user.id } },
  });

  if (existing) {
    return NextResponse.json({ error: '同じカテゴリ名は既に存在します。' }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: { name: trimmedName, userId: user.id },
  });

  return NextResponse.json(category);
}
