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

# Refuse to build an image whose client bundle cannot authenticate anyone.
# The logic lives in scripts/public-config.cjs rather than inline because a
# Dockerfile instruction cannot span lines: an inline multi-line script is parsed
# as a sequence of Dockerfile commands and fails with "unknown instruction".
RUN node scripts/public-config.cjs check

RUN npm run build

# Confirm the compiler really inlined the URL into the browser bundle. Having
# the build arguments is not sufficient: an image was shipped with both present
# and a healthy stamp while the bundle contained no Supabase config at all,
# because lib/env.ts read them by passing the whole `process.env` object to a
# schema instead of using direct member access. Only the emitted artefact can
# prove the browser will work.
RUN node scripts/public-config.cjs verify

# Record what the compiler actually received so /api/health can tell a
# mis-built image (or one predating this guard) apart from a working one.
# Runs after the build because that regenerates .next/standalone, which is the
# directory the runtime stage already copies, so the stamp ships with no extra
# COPY step. Only the URL and a presence flag are recorded; the anon key is
# never written into a file that ships in the image.
RUN node scripts/public-config.cjs stamp

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
