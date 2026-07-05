import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

let prisma: PrismaClient;

async function seedUser(id: string) {
  await prisma.user.create({
    data: { id, clerkUserId: `clerk_${id}`, isAdmin: false },
  });
}

describe('lib/rateLimit', () => {
  beforeEach(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows requests up to limit within window', async () => {
    await seedUser('u1');
    const { checkAndRecordRateLimit } = await import('@/lib/rateLimit');

    for (let i = 0; i < 3; i++) {
      const res = await checkAndRecordRateLimit('u1', 'chat', 3, 60_000);
      expect(res.ok).toBe(true);
    }
  });

  it('denies request beyond limit and returns retryAfterSeconds', async () => {
    await seedUser('u2');
    const { checkAndRecordRateLimit } = await import('@/lib/rateLimit');

    for (let i = 0; i < 3; i++) {
      await checkAndRecordRateLimit('u2', 'chat', 3, 60_000);
    }
    const res = await checkAndRecordRateLimit('u2', 'chat', 3, 60_000);
    expect(res.ok).toBe(false);
    expect(res.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('does not persist a record when denied', async () => {
    await seedUser('u3');
    const { checkAndRecordRateLimit } = await import('@/lib/rateLimit');

    for (let i = 0; i < 2; i++) {
      await checkAndRecordRateLimit('u3', 'chat', 2, 60_000);
    }
    const before = await prisma.rateLimitRecord.count({
      where: { userId: 'u3', action: 'chat' },
    });
    await checkAndRecordRateLimit('u3', 'chat', 2, 60_000);
    const after = await prisma.rateLimitRecord.count({
      where: { userId: 'u3', action: 'chat' },
    });
    expect(after).toBe(before);
  });

  it('scopes by userId (one user does not affect another)', async () => {
    await seedUser('uA');
    await seedUser('uB');
    const { checkAndRecordRateLimit } = await import('@/lib/rateLimit');

    for (let i = 0; i < 2; i++) {
      await checkAndRecordRateLimit('uA', 'chat', 2, 60_000);
    }
    const aDenied = await checkAndRecordRateLimit('uA', 'chat', 2, 60_000);
    expect(aDenied.ok).toBe(false);

    const bOk = await checkAndRecordRateLimit('uB', 'chat', 2, 60_000);
    expect(bOk.ok).toBe(true);
  });

  it('scopes by action (chat limit does not affect voice)', async () => {
    await seedUser('u4');
    const { checkAndRecordRateLimit } = await import('@/lib/rateLimit');

    for (let i = 0; i < 2; i++) {
      await checkAndRecordRateLimit('u4', 'chat', 2, 60_000);
    }
    const chatDenied = await checkAndRecordRateLimit('u4', 'chat', 2, 60_000);
    expect(chatDenied.ok).toBe(false);

    const voiceOk = await checkAndRecordRateLimit('u4', 'voice', 2, 60_000);
    expect(voiceOk.ok).toBe(true);
  });

  it('re-allows requests after window has passed', async () => {
    await seedUser('u5');
    const { checkAndRecordRateLimit } = await import('@/lib/rateLimit');

    const oldTime = new Date(Date.now() - 65_000);
    await prisma.rateLimitRecord.create({
      data: { userId: 'u5', action: 'chat', createdAt: oldTime },
    });
    await prisma.rateLimitRecord.create({
      data: { userId: 'u5', action: 'chat', createdAt: oldTime },
    });

    const res = await checkAndRecordRateLimit('u5', 'chat', 2, 60_000);
    expect(res.ok).toBe(true);
  });
});
