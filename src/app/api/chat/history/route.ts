import { ApiErrors } from '@/lib/apiError';
import { UnauthorizedError } from '@/lib/errors';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const raw = Number(searchParams.get('limit'));
    const limit =
      Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_LIMIT) : DEFAULT_LIMIT;

    const recent = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const chronological = recent
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }));

    return NextResponse.json(chronological);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return ApiErrors.unauthorized();
    }
    console.error('chat history error:', error);
    return ApiErrors.internal();
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    await prisma.chatMessage.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return ApiErrors.unauthorized();
    }
    console.error('chat history delete error:', error);
    return ApiErrors.internal();
  }
}
