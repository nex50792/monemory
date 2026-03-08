import { UnauthorizedError } from '@/lib/errors';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const tags = await prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(tags);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Tags GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const { name } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'タグ名を入力してください。' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const existing = await prisma.tag.findUnique({
      where: { name_userId: { name: trimmedName, userId: user.id } },
    });

    if (existing) {
      return NextResponse.json({ error: '同じタグ名は既に存在します。' }, { status: 409 });
    }

    const tag = await prisma.tag.create({
      data: { name: trimmedName, userId: user.id },
    });

    return NextResponse.json(tag);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Tags POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
