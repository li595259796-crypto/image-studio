import type { NextConfig } from "next";

// 'unsafe-eval' is required by @excalidraw/excalidraw's production bundle,
// which uses `new Function()` to compile rough.js path renderers at runtime.
// Without it, Chrome refuses to evaluate the code and canvas editor throws
// EvalError → caught by (dashboard)/error.tsx → "出了点问题" user-facing crash.
// Future hardening: migrate to per-route CSP so only /canvas/[id] gets
// the 'unsafe-eval' relaxation.
const contentSecurityPolicy = [
  "default-src 'self'",
  "img-src 'self' https://*.public.blob.vercel-storage.com data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.public.blob.vercel-storage.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
