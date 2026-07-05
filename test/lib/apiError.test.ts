import { describe, expect, it } from 'vitest';

describe('lib/apiError', () => {
  it('unauthorized returns 401 with AUTH_REQUIRED code', async () => {
    const { ApiErrors } = await import('@/lib/apiError');
    const res = ApiErrors.unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('AUTH_REQUIRED');
    expect(body.message).toBeDefined();
  });

  it('badRequest returns 400 with details', async () => {
    const { ApiErrors } = await import('@/lib/apiError');
    const res = ApiErrors.badRequest('invalid field', { field: 'message' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      code: 'BAD_REQUEST',
      message: 'invalid field',
      details: { field: 'message' },
    });
  });

  it('rateLimited returns 429 with Retry-After header', async () => {
    const { ApiErrors } = await import('@/lib/apiError');
    const res = ApiErrors.rateLimited(42);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(body.message).toContain('42');
  });

  it('geminiOverloaded returns 503', async () => {
    const { ApiErrors } = await import('@/lib/apiError');
    const res = ApiErrors.geminiOverloaded();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('GEMINI_OVERLOADED');
  });

  it('internal returns 500 with INTERNAL_ERROR code', async () => {
    const { ApiErrors } = await import('@/lib/apiError');
    const res = ApiErrors.internal();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });
});
