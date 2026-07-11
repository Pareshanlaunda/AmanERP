import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";

const connectSrc = [
  "'self'",
  supabaseUrl,
  "https://*.supabase.co",
  "wss://*.supabase.co",
  // Next.js HMR / Server Actions over local websockets in development
  ...(isProd ? [] : ["ws:", "wss:", "http://localhost:*", "http://127.0.0.1:*"]),
].join(" ");

const nextConfig: NextConfig = {
  // Ensure notice Word templates + signature asset are available to the download API on Vercel
  outputFileTracingIncludes: {
    "/api/notices/[id]/download": [
      "./templates/notices/**/*",
      "./public/notices/**/*",
    ],
  },
  async headers() {
    const headers: { key: string; value: string }[] = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          `connect-src ${connectSrc}`,
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ];

    // Never set HSTS in development — it can force HTTPS on localhost and break Server Actions ("Failed to fetch")
    if (isProd) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
