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

RUN npm run build

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
