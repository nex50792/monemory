import type { NextConfig } from "next";

const staticClerkOrigins = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://clerk.com",
  "https://img.clerk.com",
  "https://clerk-telemetry.com",
];

function extraClerkOrigins(): string[] {
  const raw = process.env.CSP_EXTRA_CLERK_ORIGINS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https:\/\/[a-z0-9.\-*]+$/i.test(s));
}

function frontendApiOrigin(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API ??
    process.env.CLERK_FRONTEND_API;
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return null;
  }
}

// Clerk の publishable key は末尾に base64url(domain + "$") を含むので、
// そこから Frontend API host を復元して CSP allowlist に自動追加する。
// これにより本番の custom domain を手動設定不要にする。
function frontendApiOriginFromPublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  const parts = key.split("_");
  const encoded = parts[parts.length - 1];
  if (!encoded) return null;
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf-8");
    const host = decoded.endsWith("$") ? decoded.slice(0, -1) : decoded;
    if (!/^[a-z0-9.\-]+$/i.test(host)) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

function clerkOrigins(): string[] {
  const set = new Set([...staticClerkOrigins, ...extraClerkOrigins()]);
  const explicitFrontend = frontendApiOrigin();
  if (explicitFrontend) set.add(explicitFrontend);
  const inferredFrontend = frontendApiOriginFromPublishableKey();
  if (inferredFrontend) set.add(inferredFrontend);
  return [...set];
}

const cspDirectives = () => {
  const origins = clerkOrigins();
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${origins.join(" ")} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${origins.join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self' ${origins.join(" ")} https://challenges.cloudflare.com`,
    `frame-src ${origins.join(" ")} https://challenges.cloudflare.com`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
};

const securityHeaders = () => [
  {
    key: "Content-Security-Policy",
    value: cspDirectives().join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
