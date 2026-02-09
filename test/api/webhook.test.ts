import { PrismaClient } from '@prisma/client';
import type { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: () =>
    new Map([
      ['svix-id', '1'],
      ['svix-timestamp', 't'],
      ['svix-signature', 's'],
    ]),
}));

let prisma: PrismaClient;

describe('api/public/webhook', () => {
  beforeEach(async () => {
    prisma = new PrismaClient();
    vi.resetAllMocks();
    vi.resetModules();
    process.env.CLERK_WEBHOOK_SECRET = 'secret';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 201 on user.created', async () => {
    vi.doMock('svix', () => ({
      Webhook: class {
        constructor() {}
        verify = vi.fn().mockReturnValue({
          type: 'user.created',
          data: {
            id: 'c1',
            email_addresses: [{ email_address: 'a@b' }],
            first_name: 'F',
            last_name: 'L',
          },
        });
      },
    }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(201);

    const user = await prisma.user.findFirst({
      where: { clerkUserId: 'c1' },
    });
    expect(user).toBeTruthy();
  });

  it('returns 401 on invalid signature', async () => {
    vi.doMock('svix', () => ({
      Webhook: class {
        constructor() {}
        verify() {
          throw new Error('invalid');
        }
      },
    }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(401);
  });

  it('returns 500 when webhook secret missing', async () => {
    delete process.env.CLERK_WEBHOOK_SECRET;
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(500);
  });

  it('returns 200 on user.deleted', async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: 'c-delete', isAdmin: false },
    });

    vi.doMock('svix', () => ({
      Webhook: class {
        constructor() {}
        verify() {
          return { type: 'user.deleted', data: { id: 'c-delete' } };
        }
      },
    }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(200);

    const deletedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(deletedUser?.deletedAt).not.toBeNull();
  });

  it('returns 200 on user.updated', async () => {
    const user = await prisma.user.create({
      data: { clerkUserId: 'c-update', isAdmin: false },
    });

    vi.doMock('svix', () => ({
      Webhook: class {
        constructor() {}
        verify() {
          return {
            type: 'user.updated',
            data: {
              id: 'c-update',
              email_addresses: [{ email_address: 'new@test.com' }],
              first_name: 'Updated',
              last_name: 'User',
            },
          };
        }
      },
    }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(200);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    expect(updatedUser?.name).toBe('UpdatedUser');
    expect(updatedUser?.email).toBe('new@test.com');
  });

  it('returns 400 for non user.created events', async () => {
    vi.doMock('svix', () => ({
      Webhook: class {
        constructor() {}
        verify() {
          return { type: 'something.else', data: {} };
        }
      },
    }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when verify returns undefined', async () => {
    vi.doMock('svix', () => ({
      Webhook: class {
        constructor() {}
        verify() {
          return undefined;
        }
      },
    }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when event data id missing', async () => {
    vi.doMock('svix', () => ({
      Webhook: class {
        constructor() {}
        verify = vi.fn().mockReturnValue({ type: 'user.created', data: {} });
      },
    }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(400);
  });

  it('returns 400 when headers missing', async () => {
    vi.doMock('next/headers', () => ({ headers: () => new Map() }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(400);
  });

  it('user.created with missing name/email passes nulls to prisma.create', async () => {
    vi.doMock('svix', () => ({
      Webhook: class {
        constructor() {}
        verify = vi.fn().mockReturnValue({
          type: 'user.created',
          data: { id: 'c2' },
        });
      },
    }));
    vi.doMock('next/headers', () => ({
      headers: () =>
        new Map([
          ['svix-id', '1'],
          ['svix-timestamp', 't'],
          ['svix-signature', 's'],
        ]),
    }));
    const { POST } = await import('@/app/api/public/webhook/route');

    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req as NextRequest);
    expect(res.status).toBe(201);

    const user = await prisma.user.findFirst({
      where: { clerkUserId: 'c2' },
    });
    expect(user?.email).toBeNull();
    expect(user?.name).toBeNull();
  });
});
