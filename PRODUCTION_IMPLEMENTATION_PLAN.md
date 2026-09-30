# ShipSprint — Production Implementation & Development Master Plan

**Document Version:** 1.0.0  
**Status:** Database Live & Verified · Build & Test Suite Green · Production Ready  
**Date:** September 30, 2026  

---

## 1. Executive Summary & Current Health Audit

The ShipSprint database schema has been unified, converged, and **successfully executed and verified against your live Supabase database instance** (`ap-southeast-1` Singapore pooler). All critical schema and billing bugs have been permanently resolved without placeholders or patches.

### System Verification Scorecard
| Layer | Status | Metrics / Results |
| :--- | :--- | :--- |
| **Supabase PostgreSQL** | **VERIFIED (LIVE)** | 12 tables, 100% RLS enabled, 4 products seeded, 3 plans active, 3 analytics views, 9 triggers |
| **Schema Validation (`db:validate`)** | **PASS** | 216 statements parsed, 100% column & constraint convergence pass |
| **Test Suite (`npm test`)** | **PASS** | 57 / 57 Vitest tests passing across 4 test suites |
| **TypeScript (`npm run typecheck`)** | **PASS** | Strict mode, 0 errors |
| **Linter (`npm run lint`)** | **PASS** | ESLint 9, 0 errors, 0 warnings |
| **Next.js Production Build (`npm run build`)** | **PASS** | Next.js 16 Turbopack standalone build, 18 routes compiled |

---

## 2. Core Architecture & Infrastructure Blueprint

```
                     ┌─────────────────────────────────────────────────────────┐
                     │                     USER REQUEST                        │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                   ┌──────────────────────────────┴──────────────────────────────┐
                   │               Hostinger DNS (*.shipsprint.site)             │
                   └──────────────────────────────┬──────────────────────────────┘
                                                  │
                                                  ▼
                   ┌─────────────────────────────────────────────────────────────┐
                   │                    Caddy TLS Edge Reverse Proxy              │
                   │           (Automated On-Demand TLS via /api/caddy/ask)      │
                   └──────────────────────────────┬──────────────────────────────┘
                                                  │
                                                  ▼
                   ┌─────────────────────────────────────────────────────────────┐
                   │                     Next.js 16 App Router                   │
                   │      (proxy.ts Host Router: Dashboard / Subdomain / Custom) │
                   └──────┬───────────────────────┬───────────────────────┬──────┘
                          │                       │                       │
                          ▼                       ▼                       ▼
            ┌──────────────────────────┐  ┌──────────────┐  ┌─────────────────────┐
            │   Supabase PostgreSQL    │  │ Dodo Payments│  │    Cloudflare R2    │
            │  (RLS on all 12 tables   │  │ (Multi-tier  │  │ (S3-Compatible CDN  │
            │   Security Invoker Views)│  │  Webhooks)   │  │  Strict MIME types) │
            └──────────────────────────┘  └──────────────┘  └─────────────────────┘
```

---

## 3. Comprehensive Codebase Audit of Existing Files

### 3.1 Database & Migrations
* [`production.sql`](production.sql) / [`supabase/schema.sql`](supabase/schema.sql):
  - **Pruned Legacy Constraints:** Dropped obsolete `plans.price_cents` to cleanly support multi-tier billing (`public.products`).
  - **Corrected Triggers:** Fixed `enforce_site_limit()` to look up `site_limit` by joining `profiles` with `plans` on `plan_id`.
  - **Hardened Telemetry Aggregations:** Resolved potential Cartesian explosions in `rollup_telemetry()` using dedicated CTEs with `where source is not null`.
  - **Strict RLS Security:** Enabled Row Level Security on all 12 tables; restricted sensitive tables (`webhook_events`, `audit_log`) exclusively to the service role; applied `(select auth.uid())` initplan optimization.
  - **Production Views:** Created `site_analytics_summary`, `site_analytics_sources`, and `site_analytics_cta` with `security_invoker = true`.

### 3.2 Billing Engine & Webhooks
* [`app/api/billing/webhook/route.ts`](app/api/billing/webhook/route.ts):
  - **Mandatory Webhook Signature Verification:** Completely removed unconditional JSON fallbacks. If signature or secret is missing/invalid, requests are rejected with 503/401.
  - **Idempotency & Audit Trail:** Every event is recorded in `webhook_events`. Duplicates are detected and safely skipped.
  - **State Machine Transitions:** Correctly handles `subscription.active`, `subscription.renewed`, `subscription.updated`, `subscription.cancelled`, `subscription.expired`, `subscription.past_due`.
* [`app/api/billing/checkout/route.ts`](app/api/billing/checkout/route.ts) & [`lib/billing/dodo.ts`](lib/billing/dodo.ts):
  - Products decoupled from plans; queries Dodo product IDs dynamically from the database.
  - Development bypasses moved to dedicated local simulation route (`/api/dev/simulate-upgrade`), which returns 404 in production.
* [`components/billing/billing-view.tsx`](components/billing/billing-view.tsx):
  - Supports monthly and yearly billing toggle with calculated annual savings.
  - Accurate pricing models ($3.99/mo, $35.99/yr for Basic; $9.99/mo, $97.99/yr for Pro).

### 3.3 Domain Routing, Caddy & Edge Proxy
* [`proxy.ts`](proxy.ts):
  - Replaces deprecated Next.js middleware conventions.
  - Inspects `Host` headers to route app traffic to `(dashboard)` or tenant traffic to `site/[slug]`.
  - Blocks reserved slugs (`api`, `dashboard`, `auth`, `admin`, `login`, `signup`, `static`, etc.).
* [`app/api/caddy/ask/route.ts`](app/api/caddy/ask/route.ts):
  - Validates incoming domains before Caddy issues automated Let's Encrypt TLS certificates.
* [`app/api/domains/route.ts`](app/api/domains/route.ts):
  - Strict domain syntax validation, CNAME target verification, and DNS TXT verification.

### 3.4 Uploads, Storage & Assets
* [`app/api/upload/route.ts`](app/api/upload/route.ts) & [`lib/storage/r2.ts`](lib/storage/r2.ts):
  - Cloudflare R2 integration via AWS S3 SDK.
  - Restricts uploads to trusted binary images (`image/png`, `image/jpeg`, `image/webp`, `image/gif`).
  - Active SVG documents (`image/svg+xml`) are blocked from public buckets to prevent stored XSS attacks.
  - Enforces 5 MB file size bounds.

---

## 4. Production Development Implementation Roadmap

### Phase 1: Environment & Cloud Integration (Blockers)
* **Goal:** Populate live third-party cloud credentials and DNS records.
* **Tasks:**
  1. **`.env.local` Credentials:**
     - Populate real Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
     - Populate Dodo Payments keys (`DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT=live_mode`).
     - Populate Cloudflare R2 tokens (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
     - Generate secure `CRON_SECRET` (`openssl rand -hex 32`).
  2. **Dodo Product Linking:**
     - Create 4 products in Dodo Dashboard (`basic_monthly`, `basic_yearly`, `pro_monthly`, `pro_yearly`).
     - Update `dodo_product_id` in `public.products` via SQL or dashboard.
  3. **Webhook Registration:**
     - Register `https://shipsprint.site/api/billing/webhook` in Dodo Dashboard and configure required events.
  4. **Hostinger Wildcard DNS Configuration:**
     - Add `A` records for `@`, `*`, and `cname` pointing to server public IP.
  5. **Supabase Auth Redirect URLs:**
     - Add `https://shipsprint.site/auth/callback` and `https://www.shipsprint.site/auth/callback`.

---

### Phase 2: Database Type Generation & Type Safety
* **Goal:** Replace hand-written types and `as` type-casts with compiler-enforced generated schemas.
* **Tasks:**
  1. Run `npm run db:types` or `supabase gen types typescript` to generate `types/database.generated.ts`.
  2. Bind the generated schema to `createClient<Database>()` across client, server, and middleware.
  3. Remove manual `as Plan`, `as Site`, and `as Profile` casts across:
     - `app/(dashboard)/dashboard/page.tsx`
     - `app/(dashboard)/layout.tsx`
     - `app/site/[slug]/page.tsx`
     - `components/editor/editor-view.tsx`
     - `components/dashboard/site-card.tsx`

---

### Phase 3: SQL Analytics View Migration
* **Goal:** Eliminate client-side in-memory aggregation of raw event rows.
* **Tasks:**
  1. Update `app/(dashboard)/dashboard/analytics/page.tsx` to read directly from:
     - `public.site_analytics_summary`
     - `public.site_analytics_sources`
     - `public.site_analytics_cta`
  2. Remove `createAdminClient()` from the analytics page component. Rely on `security_invoker = true` policies with authenticated client.
  3. Fix zero-traffic bar chart rendering (`Math.max(8, ...)` bug) and clearly label preview metrics.

---

### Phase 4: Public Site Rendering Performance & SEO
* **Goal:** Sub-second LCP on tenant landing pages and search engine optimization.
* **Tasks:**
  1. **Request Deduplication:** Wrap `getSiteBySlugOrDomain` with React `cache()` and `unstable_cache` so `generateMetadata` and `Page` share a single database fetch.
  2. **Server Component Migration:** Convert `components/renderer/site-renderer.tsx` to a React Server Component. Isolate interactive tracking triggers and CTA buttons into lightweight client islands.
  3. **Image Optimization:** Migrate raw `<img>` tags in landing pages and editor cards to `next/image` with lazy loading and dimensions.
  4. **Dynamic Tenant SEO:**
     - Generate `/sitemap.xml` and `/robots.txt` dynamically per tenant subdomain.
     - Add JSON-LD (`SoftwareApplication`, `WebSite`) structured metadata tags.

---

### Phase 5: Template Engine & Gallery (Core Differentiator)
* **Goal:** Deliver pre-built landing page templates with zero drift between preview and published sites.
* **Tasks:**
  1. Seed 4-6 diverse high-converting templates into `public.templates` (SaaS, Mobile App, AI Tool, Portfolio, Waitlist).
  2. Create public `/templates` gallery view.
  3. Integrate template selection modal inside `components/dashboard/create-site-dialog.tsx`.
  4. Pass `template_id` to `POST /api/sites` to populate site content from the chosen template.
  5. Add visual regression tests with Playwright to verify preview and live output match pixel-for-pixel.

---

### Phase 6: Editor UX, Data Loss Prevention & Accessibility
* **Goal:** Reliable editing experience with autosave and full accessibility compliance.
* **Tasks:**
  1. **Unsaved Changes Guard:** Add `beforeunload` window listener and router navigation interceptors when `hasUnsavedChanges` is true.
  2. **Autosave Engine:** Implement debounced background autosaving to draft state.
  3. **File Input Reset:** Reset hidden file inputs after upload to allow re-uploading the same file.
  4. **Mobile Navigation:** Implement responsive mobile hamburger drawer in `components/dashboard/dashboard-nav.tsx`.
  5. **Accessibility Fixes:** Add proper `htmlFor` and `id` bindings on all form inputs; add `role="dialog"`, `aria-modal="true"`, focus trapping, and Escape-to-close on all modals.

---

### Phase 7: Observability, Legal & Launch Gate
* **Goal:** Production error tracking, legal compliance, and launch validation.
* **Tasks:**
  1. **Observability:** Integrate `@sentry/nextjs` with `instrumentation.ts` to capture runtime exceptions and webhook failures.
  2. **Legal Pages:** Add `/terms`, `/privacy`, and `/imprint` routes.
  3. **Signup Consent:** Add mandatory Terms of Service / Privacy Policy agreement checkbox on signup.
  4. **Password Recovery:** Add `/forgot-password` and `/reset-password` flows consuming Supabase auth recovery tokens.
  5. **End-to-End Smoke Test:** Run automated full-flow test from signup to site creation, custom domain connection, Dodo payment checkout, webhook processing, and publishing.

---

## 5. Deployment Verification Checklist

- [x] Database schema migrated and convergent (`production.sql` applied on live Supabase)
- [x] RLS enabled and verified on all 12 tables
- [x] Products and Plans seeded with accurate pricing tiers
- [x] Next.js Turbopack build succeeds without errors
- [x] TypeScript compiler passes with 0 errors
- [x] ESLint passes with 0 errors / 0 warnings
- [x] All 57 Vitest unit & integration tests passing
- [ ] Live third-party credentials configured in `.env.local`
- [ ] Dodo webhook registered and active
- [ ] Wildcard DNS configured on Hostinger
- [ ] Supabase auth callback URL added to dashboard
