import { afterEach, beforeEach, describe, expect, it } from 'vitest';

async function loadHeaders(): Promise<Record<string, string>> {
  const mod = await import('../../next.config');
  const nextConfig = mod.default;
  const rules = await nextConfig.headers?.();
  if (!rules) throw new Error('headers() missing');
  const rootRule = rules.find((r) => r.source === '/:path*');
  if (!rootRule) throw new Error('root path rule missing');
  return Object.fromEntries(rootRule.headers.map((h) => [h.key, h.value]));
}

describe('next.config security headers', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    delete process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
    delete process.env.CLERK_FRONTEND_API;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CSP_EXTRA_CLERK_ORIGINS;
    const vitest = await import('vitest');
    vitest.vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const getHeaders = () => loadHeaders();

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

  it('CSP allows Clerk domains (default set)', async () => {
    const headers = await getHeaders();
    const csp = headers['Content-Security-Policy'];
    expect(csp).toContain('clerk.accounts.dev');
    expect(csp).toContain('clerk.com');
    expect(csp).toContain('img.clerk.com');
    expect(csp).toContain('clerk-telemetry.com');
  });

  it('CSP includes NEXT_PUBLIC_CLERK_FRONTEND_API host in script/connect/frame-src', async () => {
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API = 'clerk.example.com';
    const vitest = await import('vitest');
    vitest.vi.resetModules();
    const headers = await loadHeaders();
    const csp = headers['Content-Security-Policy'];
    expect(csp).toContain('https://clerk.example.com');
  });

  it('CSP includes CSP_EXTRA_CLERK_ORIGINS entries', async () => {
    process.env.CSP_EXTRA_CLERK_ORIGINS =
      'https://clerk.foo.dev, https://clerk.bar.dev';
    const vitest = await import('vitest');
    vitest.vi.resetModules();
    const headers = await loadHeaders();
    const csp = headers['Content-Security-Policy'];
    expect(csp).toContain('https://clerk.foo.dev');
    expect(csp).toContain('https://clerk.bar.dev');
  });

  it('CSP infers Frontend API host from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', async () => {
    // "clerk.example.com$" -> base64url -> "Y2xlcmsuZXhhbXBsZS5jb20k"
    const encoded = Buffer.from('clerk.example.com$').toString('base64url');
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = `pk_live_${encoded}`;
    const vitest = await import('vitest');
    vitest.vi.resetModules();
    const headers = await loadHeaders();
    const csp = headers['Content-Security-Policy'];
    expect(csp).toContain('https://clerk.example.com');
  });

  it('CSP silently ignores malformed publishable key', async () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_live_!!!not-base64!!!';
    const vitest = await import('vitest');
    vitest.vi.resetModules();
    const headers = await loadHeaders();
    // 落ちないことを確認 + 既定値は含まれる
    expect(headers['Content-Security-Policy']).toContain('clerk.accounts.dev');
  });

  it('CSP ignores malformed CSP_EXTRA_CLERK_ORIGINS entries', async () => {
    process.env.CSP_EXTRA_CLERK_ORIGINS =
      'https://clerk.ok.dev, http://insecure.dev, javascript:alert(1)';
    const vitest = await import('vitest');
    vitest.vi.resetModules();
    const headers = await loadHeaders();
    const csp = headers['Content-Security-Policy'];
    expect(csp).toContain('https://clerk.ok.dev');
    expect(csp).not.toContain('insecure.dev');
    expect(csp).not.toContain('javascript:');
  });
});
