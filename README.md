# ShipSprint

[![CI](https://github.com/jatinchaurasiya/shipsprint/actions/workflows/ci.yml/badge.svg)](https://github.com/jatinchaurasiya/shipsprint/actions/workflows/ci.yml)

**Hosted landing-page builder for indie app developers.** Write a URL in a
browser and get a live, HTTPS-served, mobile-first launch page in minutes —
with a `*.shipsprint.site` subdomain, App Store / Play Store buttons, a
screenshot carousel, and cookieless analytics already wired.

ShipSprint is a **hosting product first and a page builder second**. The
editor exists to remove the reason someone would not publish; the value is
that the page is *already live* at a real URL the moment you are done.

## Why

Page builders generate a page and leave you to deploy it — DNS, certificates,
a web server, a CDN. That last mile is where most launch pages die.
ShipSprint collapses build and hosting into one product: one wildcard
certificate covers every free subdomain, TLS is automatic, and there is
nothing to configure.

## Features

| | Free | Basic | Pro |
|---|---|---|---|
| Landing page editor (structured fields) | ✅ | ✅ | ✅ |
| Hosted subdomain (`slug.shipsprint.site`) | ✅ | ✅ | ✅ |
| Publish / unpublish, owner preview | ✅ | ✅ | ✅ |
| Screenshot upload (Cloudflare R2) | ✅ | ✅ | ✅ |
| Pages | 1 | 3 | 10 |
| Remove ShipSprint branding | — | ✅ | ✅ |
| Custom domain + automatic TLS | — | ✅ | ✅ |
| Analytics dashboard | — | — | ✅ |

Plans: Free `$0` · Basic `$3.99/mo` (`$35.99/yr`) · Pro `$9.99/mo`
(`$97.99/yr`). No credit card required for the free tier.

**Roadmap, honestly:** email capture (Basic/Pro) and a templates gallery are
the two highest-priority features not yet built. See `PRDD.md` §6 and `REMAINING-WORK.md`.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, React 19, `output: "standalone"` |
| Edge | Caddy 2.10 — wildcard TLS + on-demand TLS for custom domains |
| Database | Supabase (managed Postgres, RLS, Auth) |
| Object storage | Cloudflare R2 (S3-compatible, zero egress fees) |
| Payments | Dodo Payments (merchant of record — tax/VAT handled for you) |
| Rate limiting | Redis |
| Hosting | AWS EC2 + Docker Compose (three containers) |

Key design points:

- **One renderer, zero drift.** A single `SiteRenderer` renders the live
  page, the editor preview, and every template. Content is a
  Zod-validated document, not a layout tree.
- **Entitlements live in the database.** Site limits, reserved slugs,
  content-size and slug-format checks are enforced by triggers and `CHECK`
  constraints — not by application code the anon client can bypass.
- **Privacy-respecting analytics.** No cookies, no IP storage, no
  fingerprinting. Client IPs are salted and truncated for rate-limiting
  only, and raw events roll up into a daily aggregate.
- **Custom-domain TLS is allow-listed.** Caddy requests certificates on
  demand only for domains connected to a *published* site via
  `/api/caddy/ask` — this protects shared ACME rate limits.
- **Payments are intent-driven.** `checkout_intents` links a purchase to a
  user independent of provider metadata propagation; the webhook is
  signature-mandatory and idempotent.

## Getting started

Requires Node.js ≥ 20.9 (24 recommended, matches CI and Docker).

```bash
npm ci
cp .env.example .env.local   # fill in Supabase keys at minimum
npm run dev
```

Open http://localhost:3000. Builds and tests never require secrets; all env
validation is lazy (`lib/env.ts`).

### Useful scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest
npm run check        # typecheck + lint + build
npm run db:validate  # validate supabase/schema.sql
```

## Deploying

Production runs as three Docker containers (Caddy → Next.js standalone →
Redis) against managed Supabase and R2:

```bash
docker compose up -d --build
curl -s localhost:3000/api/health | jq
```

Full walkthrough — webhook registration, DNS records, wildcard certificate,
custom domains, cron jobs, go-live checklist — lives in
[`docs/DEPLOY.md`](docs/DEPLOY.md) and [`docs/DNS-SETUP.md`](docs/DNS-SETUP.md).

## Project layout

```
app/                 Next.js App Router — marketing site, auth, dashboard, APIs
app/site/[slug]/     Public renderer for customer launch pages
app/api/             billing, domains, sites, track, upload, caddy/ask, cron
components/          editor, renderer (SiteRenderer), dashboard, ui
lib/                 env validation, plans/tier limits, analytics, rate limiting
supabase/            schema.sql + migrations (authoritative data model)
infra/Caddyfile      edge config: wildcard cert + on-demand TLS
proxy.ts             host-based routing: app hosts vs customer sites
tests/               vitest suite
```

## Testing & CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR: typecheck,
lint (zero warnings), unit tests with coverage, production build, dependency
audit, and schema validation. See `CHANGELOG.md` for the verification log.

## Documentation

- [`PRDD.md`](PRDD.md) — product requirements, positioning, architecture, pricing, roadmap
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — production deployment runbook
- [`docs/DNS-SETUP.md`](docs/DNS-SETUP.md) — DNS/TLS setup
- [`REMAINING-WORK.md`](REMAINING-WORK.md) — known gaps and launch blockers
- [`design.md`](design.md) — locked design system and tokens

## Status

Pre-launch. The core loop (sign up → create site → publish to a live
subdomain) is built and verified in CI; see `REMAINING-WORK.md` before
operating or contributing.
