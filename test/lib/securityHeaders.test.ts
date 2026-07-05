import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('next.config security headers', () => {
  async function getHeaders() {
    const rules = await nextConfig.headers?.();
    if (!rules) throw new Error('headers() missing');
    const rootRule = rules.find((r) => r.source === '/:path*');
    if (!rootRule) throw new Error('root path rule missing');
    return Object.fromEntries(rootRule.headers.map((h) => [h.key, h.value]));
  }

  it('sets Content-Security-Policy with self default-src', async () => {
    const headers = await getHeaders();
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const headers = await getHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: DENY (clickjacking防止)', async () => {
    const headers = await getHeaders();
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  it('sets Referrer-Policy', async () => {
    const headers = await getHeaders();
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('sets Permissions-Policy with microphone allowed for self only', async () => {
    const headers = await getHeaders();
    expect(headers['Permissions-Policy']).toContain('microphone=(self)');
    expect(headers['Permissions-Policy']).toContain('camera=()');
    expect(headers['Permissions-Policy']).toContain('geolocation=()');
  });

  it('sets Strict-Transport-Security', async () => {
    const headers = await getHeaders();
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
    expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
  });

  it('CSP allows Clerk domains', async () => {
    const headers = await getHeaders();
    expect(headers['Content-Security-Policy']).toContain('clerk.accounts.dev');
  });
});
