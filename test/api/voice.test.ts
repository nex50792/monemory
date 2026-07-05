/* eslint-disable @typescript-eslint/no-explicit-any */
import * as getCurrentUserMod from '@/lib/getCurrentUser';
import { UnauthorizedError } from '@/lib/errors';
import type { User } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/getCurrentUser');

const mockTranscribeAudio = vi.fn();

vi.mock('@/lib/gemini', () => ({
  transcribeAudio: mockTranscribeAudio,
}));

const makeMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user_voice',
  name: null,
  clerkUserId: 'clerk_voice',
  email: null,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

function buildFormRequest(file: Blob | null): Request {
  const form = new FormData();
  if (file) form.append('audio', file, 'voice.webm');
  return new Request('http://localhost/', {
    method: 'POST',
    body: form,
  });
}

describe('api/voice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterAll(() => {});

  it('returns 401 when not authenticated', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockRejectedValue(
      new UnauthorizedError(),
    );
    const { POST } = await import('@/app/api/voice/route');
    const audio = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
    const res = await POST(buildFormRequest(audio));
    expect(res.status).toBe(401);
  });

  it('returns 400 when audio file is missing', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );
    const { POST } = await import('@/app/api/voice/route');
    const res = await POST(buildFormRequest(null));
    expect(res.status).toBe(400);
  });

  it('returns transcript on success', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );
    mockTranscribeAudio.mockResolvedValueOnce('先月の食費を教えて');

    const { POST } = await import('@/app/api/voice/route');
    const audio = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
    const res = await POST(buildFormRequest(audio));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transcript).toBe('先月の食費を教えて');
  });

  it('returns 415 with UNSUPPORTED_MEDIA when transcript is empty', async () => {
    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );
    mockTranscribeAudio.mockResolvedValueOnce('   ');

    const { PrismaClient } = await import('@prisma/client');
    const p = new PrismaClient();
    await p.user.create({
      data: {
        id: 'user_voice',
        clerkUserId: 'clerk_voice',
        isAdmin: false,
      },
    });
    await p.$disconnect();

    const { POST } = await import('@/app/api/voice/route');
    const audio = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
    const res = await POST(buildFormRequest(audio));

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.code).toBe('UNSUPPORTED_MEDIA');
  });

  it('returns 429 with Retry-After when rate limit exceeded', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const p = new PrismaClient();
    await p.user.create({
      data: { id: 'user_voice', clerkUserId: 'clerk_voice', isAdmin: false },
    });
    for (let i = 0; i < 10; i++) {
      await p.rateLimitRecord.create({
        data: { userId: 'user_voice', action: 'voice' },
      });
    }
    await p.$disconnect();

    vi.spyOn(getCurrentUserMod, 'getCurrentUser').mockResolvedValue(
      makeMockUser(),
    );
    mockTranscribeAudio.mockResolvedValue('never called');

    const { POST } = await import('@/app/api/voice/route');
    const audio = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });
    const res = await POST(buildFormRequest(audio));

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(mockTranscribeAudio).not.toHaveBeenCalled();
  });
});
