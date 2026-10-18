import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Origins the browser actually talks to, verified against the code:
// flagcdn.com / media.formula1.com / api.multiviewer.app / livetiming.formula1.com
// serve driver headshots, team badges, circuit art and flags through plain
// <img> tags, and team-radio audio streams from the provider-published
// livetiming URLs. The browser Supabase client (favorites, auth, push prefs)
// hits *.supabase.co. OpenF1 is fetched server-side only, so it is not here.
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next bootstrap and hydration scripts are inline; dev tooling needs eval.
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://flagcdn.com https://media.formula1.com https://api.multiviewer.app https://livetiming.formula1.com https://r2.thesportsdb.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' https://livetiming.formula1.com https://media.formula1.com https://api.multiviewer.app",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.formula1.com" },
      { protocol: "https", hostname: "api.multiviewer.app" },
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
};

export default nextConfig;
