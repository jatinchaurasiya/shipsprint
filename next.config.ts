import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy is intentionally not set here. The published landing
 * pages embed customer-uploaded images from an R2 domain and a future set of
 * customer custom domains, so a static policy would either break them or need a
 * wildcard that defeats the purpose. Caddy sets the CSP at the edge (see
 * infra/Caddyfile in Phase 10), where it can be scoped per-site and relaxed for
 * the authenticated dashboard.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Do not advertise the framework.
  poweredByHeader: false,

  // Emits a self-contained server bundle for the Docker image in Phase 9.
  output: "standalone",

  // Typechecking is already enforced in CI/pre-commit (0 errors).
  // Skipping in Docker prevents Node out-of-memory errors on small servers.
  typescript: {
    ignoreBuildErrors: true,
  },

  // The AWS SDK is large and should never be traced into a route bundle.
  serverExternalPackages: ["@aws-sdk/client-s3"],

  // Enables next/image for customer uploads. Both the custom R2 domain and the
  // r2.dev fallback are needed.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      ...(process.env.R2_PUBLIC_DOMAIN
        ? [
            {
              protocol: "https" as const,
              hostname: process.env.R2_PUBLIC_DOMAIN,
            },
          ]
        : []),
    ],
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
      {
        source: "/templates",
        destination: "/",
        permanent: true,
      },
      {
        source: "/dashboard/templates",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
