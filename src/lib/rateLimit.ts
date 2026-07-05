import { prisma } from '@/lib/prisma';

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds?: number;
};

export const RATE_LIMIT_CHAT = {
  action: 'chat',
  limit: 20,
  windowMs: 60_000,
} as const;

export const RATE_LIMIT_VOICE = {
  action: 'voice',
  limit: 10,
  windowMs: 60_000,
} as const;

export async function checkAndRecordRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.rateLimitRecord.count({
    where: { userId, action, createdAt: { gte: since } },
  });

  if (count >= limit) {
    const oldest = await prisma.rateLimitRecord.findFirst({
      where: { userId, action, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    const retryAfterMs = oldest
      ? oldest.createdAt.getTime() + windowMs - Date.now()
      : windowMs;
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  await prisma.rateLimitRecord.create({ data: { userId, action } });
  return { ok: true };
}
