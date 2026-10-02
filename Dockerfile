# syntax=docker/dockerfile:1

# ===========================================================================
# Multi-stage build. The runtime image contains only the Next.js standalone
# output, not the full node_modules tree or the build toolchain.
# ===========================================================================

# --- Stage 1: dependencies -------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app

# Copied separately so this layer is cached until dependencies actually change.
COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: build --------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public

# `output: "standalone"` in next.config.ts produces a self-contained server
# bundle. NEXT_PUBLIC_* values are inlined at this point, so they must be
# supplied as build args rather than only as runtime env.
#
# The build must succeed without secrets: lib/env.ts validates lazily, so a
# missing key fails at the point of use rather than breaking compilation.
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_ROOT_DOMAIN="localhost:3000"
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=2048"

# ---------------------------------------------------------------------------
# Refuse to build an image whose client bundle cannot authenticate anyone.
#
# NEXT_PUBLIC_* values are substituted into the JavaScript bundle by the
# compiler, so a value that is missing at build time cannot be supplied by
# docker-compose at runtime. An earlier build silently succeeded with these
# unset: the server started, every page rendered, /api/health reported
# "healthy" because compose DOES pass the values as runtime env, and only the
# browser was broken — `process.env.NEXT_PUBLIC_SUPABASE_URL` evaluated to
# `undefined`, lib/env.ts threw on the first `publicEnv()` call, and signup
# deadlocked with every button permanently disabled.
#
# Three distinct failure shapes were observed, and they are not equivalent:
#   value present      -> inlined correctly
#   value empty ("")   -> inlined as ""        -> Zod "must not be empty"
#   value absent       -> key omitted entirely -> Zod "received undefined"
# Only the guard below distinguishes them. A build that cannot prove the
# public config is valid must not produce an image.
# ---------------------------------------------------------------------------
RUN node -e '
const required = ["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const missing = required.filter((k) => !process.env[k] || !process.env[k].trim());
if (missing.length) {
  console.error("\n" + "=".repeat(72));
  console.error("BUILD ABORTED: missing required NEXT_PUBLIC_* build arguments");
  console.error("=".repeat(72));
  for (const k of missing) console.error("  - " + k + " is " + (process.env[k] === undefined ? "ABSENT" : "EMPTY"));
  console.error("");
  console.error("These are inlined into the client bundle at BUILD time and cannot be");
  console.error("supplied at runtime. Pass them as --build-arg, or as repository");
  console.error("secrets consumed by .github/workflows/deploy.yml:");
  console.error("");
  console.error("  NEXT_PUBLIC_SUPABASE_URL      https://<project-ref>.supabase.co");
  console.error("  NEXT_PUBLIC_SUPABASE_ANON_KEY <supabase anon / publishable key>");
  console.error("");
  console.error("Shipping an image built without them yields a site where the server");
  console.error("looks healthy and signup is permanently disabled.\n");
  process.exit(1);
}
console.log("public build config OK");
'

RUN npm run build

# Record what the compiler actually received, so /api/health can tell a
# mis-built image (or one predating this guard) apart from a working one.
#
# Written into the standalone output rather than /app so the existing COPY below
# carries it into the runtime image with no extra copy step. It must be written
# after `npm run build` because that regenerates .next/standalone.
#
# Only the URL and a presence flag are recorded. The anon key is deliberately
# not copied into a file that ships in the image.
RUN node -e '
const fs = require("fs");
fs.writeFileSync(".next/standalone/public-config.json", JSON.stringify({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()),
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}) + "\n");
console.log("wrote public-config.json into the standalone output");
'

# --- Stage 3: runtime ------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as a non-root user. The node image ships one already.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# `sharp` and the AWS SDK are traced into the standalone bundle where needed.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Reports degraded rather than healthy when the database is unreachable, so an
# orchestrator can distinguish "process up" from "process useful".
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
