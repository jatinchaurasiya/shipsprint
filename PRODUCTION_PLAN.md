# ShipSprint — Production Plan

**Product:** Landing-page builder for indie app developers. Create a live, hosted launch page in minutes. Free tier gets a `slug.shipsprint.site` subdomain; paid tiers add custom domains, analytics, and branding removal.

**Stack (decided):** Next.js 16 App Router (standalone) on AWS EC2 · Caddy as TLS-terminating edge · Supabase (managed) · Cloudflare R2 · Dodo Payments · Redis for rate limits.

**Status today:** 41 files, 5 commits. UI layer is genuinely finished. Backend is a prototype. **Not deployable.**

---

## Non-negotiables

1. **Never deploy before Phase 1 completes.** There are 8 P0 holes, two of which are free-money and free-Pro-for-life.
2. **No production behavior may depend on an env value's *wording*.** The current `apiKey.includes("placeholder")` check is the only thing between you and a production plan-escalation bug.
3. **No user-supplied URL reaches an `href` or an upload bucket unvalidated.**
4. **No unauthenticated write endpoint is unbounded.**
5. **The editor preview and the live page must render from the same component.** That is your product's core promise — protect it with a visual regression test.

---

# Phase 0 — Foundation

**Goal: a green `npm run build` on a clean machine with validated env.**

The repo has never had `node_modules` installed. You do not currently know if it compiles. Everything after this phase assumes it does.

### 0.1 Install and compile
- `npm install` (lockfile is v3, `npm` only — no yarn/pnpm)
- `npm run build` — capture every warning and error. Expect: Next 16 deprecation for `middleware.ts` (should be `proxy.ts`), Tailwind unknown-class warnings, type errors.
- Add scripts: `typecheck` (`tsc --noEmit`), `lint:fix`, `db:migrate`, `db:seed`, `db:types`, `db:reset`

### 0.2 Environment
- Create `.env.example` documenting all 15 vars. **Add `!.env.example` to `.gitignore`** — line 34 ignores `.env*` with no negation, so a committed example would be silently dropped.
- Add `lib/env.ts`: a Zod schema, parsed once at module load.
  - Server vars (`SUPABASE_SERVICE_ROLE_KEY`, `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PRODUCT_ID_*`, `R2_*`, `REDIS_URL`): required, fail fast with a readable message.
  - Client vars (`NEXT_PUBLIC_*`): also validated so a missing value gives one clear error instead of a Supabase stack trace.
  - **Delete the `!` non-null assertions** in `lib/supabase/{client,server,admin}.ts`.
  - **Delete the `includes("placeholder")` sniffing** in `lib/billing/dodo.ts:10` and `lib/storage/r2.ts:16-17,63`. Replace with explicit `isProduction()` checks. A missing Dodo key in production must be a hard 503, never a silent downgrade.
  - Standardize failure modes: all three currently differ (`admin.ts` throws, `dodo.ts`/`r2.ts` return `null`, `supabase/middleware.ts:12-14` silently degrades to anonymous — that last one means a broken env silently disables the `/dashboard` middleware guard).

### 0.3 Config files
- **`next.config.ts` is empty.** Add: `poweredByHeader: false`, `output: "standalone"`, security headers (`X-Frame-Options: DENY`, `HSTS`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`), `images.remotePatterns` for the R2 domain, `serverExternalPackages: ["@aws-sdk/client-s3"]`.
- **`tsconfig.json`:** `target` ES2017 → ES2022. Add `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`. Drop `allowJs` (zero `.js` files exist). These three flags alone would have caught ~15 current bugs, including `hostParts[0]` in the middleware and `dailyMap[dayKey]` in analytics.
- **`globals.css:25` sets `font-family: Arial`** — this overrides `@theme --font-sans`, so **Geist is downloaded by `next/font` at build time and then never rendered.** Delete the line and apply `font-sans` to the body.
- **`tailwindcss-animate` is not installed** but `animate-in` / `fade-in` are used in 13 places — every modal and section transition is a silent no-op. Install it or delete the classes. Install it.
- **`scrollbar-thin` / `scrollbar-none` are used in 4 places and defined nowhere.** Add them to `globals.css`.
- Add `scroll-mt-*` to anchored sections — the sticky header currently covers in-page anchor targets.
- Add a `prefers-reduced-motion` media query (a11y, and Lenis currently ignores it).
- **`eslint.config.mjs` has no `rules` block at all.** Add: `no-explicit-any` (warn), `no-unused-vars`, `no-console`, `jsx-a11y`, and `no-restricted-imports` blocking `@/lib/supabase/admin` outside server files.

### 0.4 Dead code removal
- 14 unused imports (list in audit §8.9).
- `lib/utils.ts` — **both exports have zero importers.** Wire up `cn()` and use `formatPrice()` so pricing has one source of truth, or delete the file.
- `openai@^6.49.0` and `@aws-sdk/s3-request-presigner` — installed, never imported. Remove or use.
- 5 default `public/*.svg` from create-next-app, referenced by nothing.
- `types/database.ts:90` `DomainVerification` interface, zero importers.

### 0.5 Missing route files
Add `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, and `loading.tsx` in `(dashboard)` segments. `editor/[id]/page.tsx:33` calls `notFound()` with no custom 404 — users see Next's bare default.

### 0.6 README
Replace the verbatim create-next-app template. Cover: product overview, architecture diagram, full env table, local setup, migration workflow, the `*.localhost:3000` subdomain dev trick, and deploy steps.

**Done when:** `npm ci && npm run typecheck && npm run lint && npm run build` all pass on a fresh clone with only `.env.local` populated.

---

# Phase 1 — Security (BLOCKER)

**Goal: no path to free Pro, free money, or another user's data.**

Eight confirmed holes. Each has a regression test in Phase 8.

### 1.1 Unauthenticated webhook forgery — CRITICAL
`app/api/billing/webhook/route.ts:12` makes signature verification **conditional**. With `DODO_PAYMENTS_WEBHOOK_KEY` unset, line 31 accepts raw `JSON.parse`. No `NODE_ENV` gate. Anyone can POST `{type:"subscription.active", data:{metadata:{user_id:"<victim>", plan_id:"pro"}}}`.

**Fix:** verification is **mandatory**. If the key is absent → `503`, in every environment. The dev path is a separate explicitly-registered local route, never a branch in the production handler.

### 1.2 Free plan escalation — CRITICAL
`app/api/billing/checkout/route.ts:42-59`. When `getDodoClient()` returns `null` (missing *or placeholder* key), the handler writes `plan_id` directly with the service-role client. Not gated on `NODE_ENV`. Deploy with a placeholder key → every visitor gets Pro.

**Fix:** delete the branch. Simulated upgrades live in a dev-only route registered only when `NODE_ENV !== "production"`.

### 1.3 Open redirect — HIGH
- `app/(auth)/auth/callback/route.ts:13` — `new URL("https://evil.com", base)` returns `https://evil.com`. A crafted confirmation link redirects the user to an attacker site **immediately after a successful, trusted email click.**
- `app/(auth)/login/page.tsx:12,44` — `router.push(next)` from an unvalidated query param.

**Fix:** a shared `safeRedirectPath()` helper. Accept only values matching `^/[^/\\]` that do not start with `//` and contain no `:`. Default to `/dashboard`. Apply to every redirect in the app, including the middleware.

### 1.4 Service-role key exposure — HIGH
`lib/supabase/admin.ts` has **no `import "server-only"`**. One stray client-component import bundles the service-role key into the browser.

**Fix:** add `import "server-only"`. Add the ESLint `no-restricted-imports` rule as defence in depth.

### 1.5 Stored XSS via content — HIGH
`components/renderer/site-renderer.tsx:160,207,228,378,391,424` render `store_links[].url` and `legal_links[].url` into `<a href>`. `type="url"` in the editor is a hint, not a constraint. `javascript:alert(1)` is accepted and rendered.

**Fix:** validate on **write** — a `httpUrl` Zod schema rejecting anything not `http:`/`https:`. Plus a `safeHref()` guard at render time. Defense in depth, because old rows already exist.

### 1.6 SVG upload → stored XSS — HIGH
`app/api/upload/route.ts:32` allows `image/svg+xml` into a **public** R2 bucket. SVG is an active document that can carry `<script>` and `onload=`. `<img>` neutralizes it in-page, but the R2 URL is public and shown in the editor — open it directly and it executes.

**Fix:** drop `image/svg+xml` from the allow-list and from the `accept` attribute in `editor-panel.tsx:298`. If SVGs are ever wanted back, sanitize server-side with a DOMPurify-on-server pipeline and serve with `Content-Disposition: attachment`.

### 1.7 Plan quota bypass via PostgREST — HIGH
`supabase/migrations/001_initial_schema.sql:119` allows any authenticated user to `INSERT` into `sites` directly, using the anon key that ships to the browser. This bypasses `site_limit` **and** the editor entirely (set `status: "published"` yourself). The quota check in `app/api/sites/route.ts:64-74` is advisory.

**Fix, in the database** (not the app — app checks are always bypassable):
- A `BEFORE INSERT` trigger on `sites` that reads the owner's plan and raises if the count is at the limit.
- Restrict `UPDATE` to prevent setting `status='published'` outside the sanctioned path, or accept it and let the trigger also validate content shape.
- Wrap `auth.uid()` in `(select auth.uid())` in **all 12 policies** — required for the initplan optimization and correctness under RLS.

### 1.8 Subdomain takeover via reserved slugs — MEDIUM
`app/api/sites/route.ts` sanitizes but does not reserve. A user can claim `api`, `dashboard`, `admin`, `login`, `www`. The DNS wildcard points `*.root` at the app, so `dashboard.root` is reachable.

**Fix:** a reserved-slug list enforced in a DB constraint (not just the app), covering app routes plus system terms.

### Also in this phase
- **Slug reservation list** must be a shared constant used by both `api/sites/route.ts:28-33` and `create-site-dialog.tsx:39-46` — two divergent copies exist today.
- **Error leakage:** `checkout/route.ts:63`, `portal/route.ts:46`, `domains/route.ts:158`, `sites/[id]/route.ts` all return `error.message` verbatim, which can include upstream API responses. Return a generic message, log the detail.
- **Reserved `alert()` calls** in `site-card.tsx:57,65` and `editor-panel.tsx:146,153`.
- **`/api/upload` base64 fallback** (`route.ts:63-73`) writes multi-megabyte `data:` URIs into `sites.content` jsonb. Gate behind `NODE_ENV`.
- **Delete-site orphan cleanup:** `sites/[id]/route.ts:146-150` deletes the row but leaves every R2 object forever.

**Done when:** a test suite proves (a) unsigned webhook → 503, (b) `POST /api/billing/checkout` with no Dodo key in production → 503, (c) `/auth/callback?next=https://evil.com` → `/dashboard`, (d) an SVG upload → 415, (e) a direct PostgREST insert past the limit → RLS error, (f) `javascript:` hrefs → 400 on write.

---

# Phase 2 — Data layer

**Goal: the compiler verifies the database schema, and the database refuses bad data.**

Root cause of several existing bugs: `types/database.ts` is **hand-written** and every query is `as`-cast, so nothing ever checks code against the schema. That is precisely how the guaranteed-to-fail `onConflict: "site_id"` shipped.

### 2.1 Generated types
- `npx supabase gen types typescript --project-id <id> --schema public > types/database.ts`
- Configure the Supabase client with the generated `Database` type so queries are inferred.
- **Delete every `as` cast**: `dashboard/page.tsx:48`, `(dashboard)/layout.tsx:40-41`, `editor/[id]/page.tsx:53`, `site/[slug]/page.tsx:52-58`, `billing/page.tsx:48-50`, `analytics/page.tsx:58`. Missing rows should become real type errors or explicit `notFound()`.

### 2.2 Zod on every boundary
One schema module per domain. Every route validates its body with `.safeParse()` and returns 400 with field-level errors.
- `SiteContent` — the big one. `app/api/sites/[id]/route.ts:75-83` accepts **arbitrary jsonb with no validation and no size cap.** A client can PUT 50 MB. Define the full editor content shape, cap depth and string length, cap total serialized size (target 256 KB).
- `CreateSiteInput`, `UpdateSiteInput`, `DomainInput`, `CheckoutInput`, `TrackEventInput`.

### 2.3 Database migration (`002_hardening.sql`)
- `ALTER TABLE domain_verifications ADD CONSTRAINT domain_verifications_site_id_key UNIQUE (site_id)` — **this is the bug at `api/domains/route.ts:119`.** Without it, `onConflict: "site_id"` throws 42P10 on every call, the error is unchecked, and the API returns `{success:true}`. Every customer has "successfully" connected a domain that was never recorded.
- Missing indexes: `sites(user_id)`, `subscriptions(user_id)`, `domain_verifications(site_id)`. Every dashboard, analytics, and billing query filters on the first two.
- CHECK constraints: `sites.status IN ('draft','published')`, `subscriptions.status IN (...)`, `plans.id IN ('free','basic','pro')`. Currently all three are free-text, so a typo permanently bricks a site.
- `handle_new_user()` is `SECURITY DEFINER` without `SET search_path` — add `set search_path = public, pg_temp` (search-path hijacking).
- Verify line 179: `drop trigger if exists on_auth_user_created on auth.users;` — **the `if exists` sits in the column-list position. If this is a syntax error it aborts the entire migration.** Test against a real database before assuming your schema is live.
- New `audit_log` table (actor, action, entity, before/after, ip, created_at) — right now you cannot answer "who changed this plan?" or "when was this domain connected?"
- New `webhook_events` table for idempotency and debugging (Phase 4).
- Add `telemetry_daily` rollup table (Phase 5).

### 2.4 Behaviour fixes
- `published_at` is set on publish but **never cleared** on unpublish (`sites/[id]/route.ts:85-90`).
- Slug uniqueness is a TOCTOU: check at `route.ts:77`, insert at `:138`. A racing request gets a 500 instead of a 409. Catch `23505` and return 409.
- Seeded defaults are fake: `store_links` = `https://apps.apple.com` and `https://play.google.com` (`route.ts:123-124`), `legal_links` = `"#"` (`:130-131`), `contact_email` = `support@example.com` (`:133`). A freshly published site shows a "Download on the App Store" button linking to Apple's homepage.
- `/api/domains` DELETE reads `site_id` from a **request body** (`route.ts:150`) — many proxies drop DELETE bodies. Move to a path param.
- `api/track` and `sites/[id]` use bare `request.json()` with no `.catch` → malformed body gives 500 instead of 400.

**Done when:** `npx tsc --noEmit` passes with zero `as`-casts on database rows, and a test asserts that an oversized `content` payload returns 400.

---

# Phase 3 — Custom domains + the hosting edge

**Goal: real, verifiable, auto-renewing TLS for paid custom domains, and one wildcard cert for every free subdomain.**

Decision made: **Caddy with on-demand TLS**, not Cloudflare for SaaS. Cloudflare for SaaS with custom hostnames is a ~$200/mo Enterprise product. Caddy is free, open source, and self-hosted — and you are already running it.

### 3.1 The edge (Phase 10 delivers the file; Phase 3 defines the contract)
```caddyfile
shipsprint.site      { reverse_proxy app:3000 }
*.shipsprint.site    { reverse_proxy app:3000 }   # one wildcard cert, DNS-01
```
- **One** DNS A record `*.root → EC2 IP`.
- **One** wildcard certificate covering all free subdomains, issued via DNS-01, auto-renewed by Caddy. Unlimited free subdomains at zero per-site cost.
- Custom domains get **on-demand TLS**: Caddy calls `GET /caddy/ask?domain=...` before issuing. That endpoint checks `sites.custom_domain` and returns 200 only for a domain you own.
- Abuse protection: the ask endpoint is the allow-list (an unknown domain can never get a cert), plus a per-domain issuance cap, plus an ACME contact email.
- `on_demand_tls` requires `ask` over HTTPS on a loopback address and a short timeout — Caddy retries and serves the site over plain HTTP if issuance is slow. Tune deliberately.

### 3.2 The verification state machine (replaces the theatre)
Current `domain_verifications` is **write-only** — `cloudflare_hostname_id`, `ssl_status`, `status`, `checked_at` are written once and never read. There is no `GET /api/domains`, no polling, no cron. Meanwhile `editor-panel.tsx:746` displays **"Status: Active & TLS Verified"** the instant the user clicks Connect, before any DNS record exists. The UI also advertises "on-demand TLS automatically issues and renews your SSL certificate on the first visitor request" — no ACME client exists anywhere in the repo.

Add `002` migration columns and a real flow:
- `status`: `pending_dns` → `pending_validation` → `active` | `failed`
- `ssl_status`: `pending` → `issuing` → `active` | `failed` (updated by the ask endpoint + a reconcile cron)
- `GET /api/domains?site_id=` returning real state
- `POST /api/domains/verify` — a **DNS TXT check** (`_shipverify.root.domain`) proving the domain points at you, independent of Caddy. Plus a CNAME-presence check for the custom domain itself.
- **Cron** (`/api/cron/domains`, secret-guarded) reconciling `pending` rows older than 10 minutes.
- **UI must display actual state.** No "TLS Verified" until `ssl_status='active'` is real.

### 3.3 Fix the contradictory DNS instructions
`api/domains/route.ts:116` stores `ownership_verification.name = cleanDomain.split(".")[0]` (e.g. `"myapp"`), but the response at `:126` and the editor table at `editor-panel.tsx:800-804` both say `"@ or app"`. **Two different answers to the same question.** The API response is the single source of truth; the editor renders it.

Also: an apex domain (`myapp.com`) requires an `A`/`ALIAS` record, not a `CNAME` — the current instructions are wrong for the most common case.

### 3.4 A more robust plan
- `cname.root.domain` DNS target is **hardcoded** at `route.ts:117` and `:127` — make it an env var.
- Add IDN/punycode normalization and a length cap.
- Rate-limit domain connects (LE has hard rate limits; a bad actor can exhaust them and lock you out of issuance for a week).
- Plan gate (`plans.has_custom_domain`) is currently bypassable via PostgREST — Phase 1.7 must cover it.

**Done when:** a test suite provisions a real subdomain and a real custom domain against a staging Caddy, the cert appears in Caddy's log, `ssl_status` reaches `active` without a human touching the DB, and the UI never claims verification before it is true.

---

# Phase 4 — Billing (real Dodo Payments)

**Goal: customers can pay, be upgraded correctly, downgrade, cancel, and be rescued when a payment fails.**

### 4.1 Make verification mandatory (with 1.1)
Signature check on every request, or 503. No dev branch inside the production handler.

### 4.2 Fix the upgrade path — the "I paid but I'm still on Free" bug
`webhook/route.ts:47-49` reads `data.metadata.user_id` / `data.metadata.plan_id`. You set that metadata on the **checkout session** (`lib/billing/dodo.ts:75-77`). **Dodo does not guarantee metadata propagates from a checkout session onto `subscription.active` or `payment.succeeded` payloads.** If it doesn't, `userId && planId` is falsy, the entire block is skipped, and nobody is ever upgraded.

**Fix — stop relying on propagation:**
1. At checkout, persist a `checkout_intents` row (`user_id`, `plan_id`, `session_id`, `status: 'pending'`, created_at) before redirecting.
2. In the webhook, resolve `user_id` by looking up the subscription/checkout session server-side and joining to your intent row. Metadata becomes a convenience, not a dependency.
3. Verify against live Dodo event payloads before launch — log every event type and shape to the `webhook_events` table for a week of real traffic, and read them.

### 4.3 `dodo_customer_id` is never set
`createCheckout` sends `customer: { email }` with **no metadata**, and nothing ever calls `customers.create`. The portal at `portal/route.ts:22-27` 404s for every real subscriber unless the subscription event happens to carry `data.customer.customer_id`. So "Manage Subscription" is hidden (`billing-view.tsx:162`) and **there is no way to cancel or get an invoice in-app.**

**Fix:** create or fetch the customer at checkout, store `dodo_customer_id` on `profiles` immediately, and always pass `metadata: { user_id }` on the customer.

### 4.4 Complete the state machine
Currently only 5 event types, and one of them is a bug.
- `payment.failed` — **not handled at all.** This is the dunning path and Dodo's docs call it out. A failed renewal should mark the subscription `past_due` and start a grace period.
- `subscription.cancelled` downgrades to `free` **immediately** (`webhook/route.ts:93-99`), ignoring `current_period_end`. A user who cancels mid-period loses paid features they already paid for. **Downgrade when the period actually ends.**
- Add `on_hold`, `paused`, `refunded`, `payment.refunded`.
- Cancel = set `cancel_at_period_end`; a separate cron downgrades on expiry.

### 4.5 Idempotency and observability
- `webhook_events` table with a unique constraint on Dodo's event id. Dodo **will** retry; today every retry re-runs the upsert and the profile update.
- Unknown event types currently return `{received:true}` with only a `console.log` (`route.ts:41`) — the only `console.log` in the repo, on a serverless runtime nobody reads. **There is currently no way to debug billing in production.** Write every event to the table.
- Add `payment_attempt` audit rows for dunning history.

### 4.6 Product gaps
- **No downgrade path.** `POST` only accepts `basic|pro` (`route.ts:20`), and the UI's plan buttons are `disabled` (`billing-view.tsx:330-335,359-364`). Users are stuck. Add downgrade + cancel-in-app.
- **Four sources of pricing truth**: `plans.price_cents` (never read), `app/page.tsx:228,271,319`, `billing-view.tsx:97,115,131`, `dodo.ts:30,35`. Make the database authoritative; render from it.
- **Marketing CTAs all point at `/signup`** (`app/page.tsx:255,299,351`). "Choose Basic" does not start a checkout. Pass the plan through signup → billing.
- **Success banner is driven by `?success=true`** (`billing-view.tsx:34`) — visit `/dashboard/billing?success=true&plan=pro` and it congratulates you. Confirmation must come from the webhook, not a URL parameter.
- `billing/page.tsx:32-38` selects the **latest** subscription, not the **active** one. Upgrade twice and the renewal date is wrong.
- Feature copy over-promises: Basic claims "Custom app color accent themes" (no theme system exists — `sites.theme` is a dead column) and Pro claims "Priority 24/7 maker support" (no support channel). **Shipping pricing-page claims you don't deliver is a chargeback and trust problem.**
- `customer: { email }` with no `name` or `billing_address` → **wrong EU/UK VAT**, and Dodo is merchant-of-record so the tax error is yours.

**Done when:** a test harness can drive a real Dodo test-mode checkout → webhook → verified plan upgrade → cancel → period-end downgrade, end to end, with no manual DB edits.

---

# Phase 5 — Analytics

**Goal: numbers you can trust, and that can't be destroyed by a bored person with `curl`.**

### 5.1 Close the abuse holes
`app/api/track/route.ts` is unauthenticated, unrated, unbounded, and **only checks that the site exists — not that it is published** (`:30-41`). Anyone can inflate any site's numbers, including a competitor's and any draft's. No body-size cap; `meta` is attacker-controlled and later trusted by `analytics-view.tsx`.

- **Rate limit** per IP and per site (Redis, sliding window). The IP is read at `:45` and discarded — hash it with a daily-rotating salt rather than storing raw.
- **Reject events for non-published sites.**
- Cap `meta` size and key count; allow-list keys.
- Bot filter: `user-agent` is already read (`:44`) — maintain a small blocklist plus `Sec-Fetch-*` heuristics.
- Return 204 on success (it is a beacon), and prefer `navigator.sendBeacon` over `fetch({keepalive:true})` (`site-renderer.tsx:70-90`).
- `:79` returns 404 for a missing site — a **site-ID oracle**. Return 204 always.

### 5.2 The metrics are structurally wrong
- **Traffic sources are wrong.** `analytics-view.tsx:78` reads `ev.meta.referrer` for *every* event, but only `page_view` events carry a referrer (`site-renderer.tsx:82`). **Every single `button_click` is counted as "Direct."** The panel systematically over-reports direct traffic. Attach the session referrer to click events too.
- **Device distribution is wrong.** It counts all events, so a visitor who clicks 3 times is counted 4 times. The label says "Visitor device categories."
- **Timezone skew.** `dailyMap` is seeded from local-time `Date` → `toISOString()` (UTC) at `:49-51`, and events are keyed by `ev.created_at.slice(0,10)` (UTC) at `:56`. Buckets are off by up to ±14 hours.
- **The chart lies about zero.** `Math.max(8, ...)` at `:326-327` renders zero-traffic days as visible bars.
- **CTR window mismatch.** Metrics computed over 30 days of data, displayed as 7 days.

### 5.3 Stop aggregating in the browser
`analytics/page.tsx:46-56` fetches up to **1000** rows over 30 days via the service-role client, then `analytics-view.tsx:38-115` aggregates all of it **in the browser** inside a `useMemo`. Past 1000 events the numbers are silently wrong, and the whole event set is serialized into the RSC payload — potentially hundreds of KB.

**Fix:**
- A Postgres view or RPC doing the aggregation server-side (`group by` date, referrer, device, event type). Return ~20 rows, not 1000.
- The `createAdminClient()` at `analytics/page.tsx:46` is **unnecessary** — RLS policy #10 already lets a user read their own events. Using the service-role key here means a missing key 500s the page for every Pro user, for no benefit.
- Add a `telemetry_daily` rollup table populated by cron, and have the dashboard read the rollup. Keeps queries O(1) forever.
- Retention cron: delete raw events older than 90 days.

### 5.4 Product
- Hardcoded fake metrics in the Pro upsell (`analytics-view.tsx:189-206`: 4,289 views / 24.4% CTR). Users will screenshot these as their own. Label them clearly as sample data.
- Add date-range picker, CSV export, and per-site drill-down.

**Done when:** a 10k-event load test returns correct aggregates, and 10,000 forged requests from one IP produce at most a handful of rows.

---

# Phase 6 — Performance

**Goal: the public landing page — your entire product surface — is fast and cheap.**

### 6.1 Kill the double query on every page view — HIGHEST IMPACT
`app/site/[slug]/page.tsx` calls `getSiteBySlugOrDomain()` **twice per request** — once in `generateMetadata` (`:64-104`) and once in the page. That's **two uncached service-role Postgres round-trips on every view of every published site**, with no `revalidate`, no `unstable_cache`, no `cache()`, no CDN.

- Deduplicate with React `cache()` so metadata and page share one fetch.
- Wrap in `unstable_cache` / `revalidate` with a tag per site; call `revalidateTag(site.id)` on save/publish. Native ISR — no Redis needed for reads.
- Never query a draft with the service-role key for metadata: `generateMetadata` currently emits draft headlines into `<head>` for non-owners.

### 6.2 The renderer is a client component
`components/renderer/site-renderer.tsx:1` is `"use client"`, so your **entire public SEO/product surface** ships as a client bundle and renders nothing until hydration. For a product whose customers' sites need to rank, this is the wrong trade.

- Make the renderer a **Server Component**. Isolate only the beacon and CTA click handlers into small client islands.
- This also fixes a 1:1 LCP/TTFB regression and cuts the JS bundle substantially.

### 6.3 Middleware
- **The matcher excludes only `_next/static`, `_next/image`, `favicon.ico`, and image extensions** — so `supabase.auth.getUser()` does a **full network round-trip on essentially every request**, including every `/api/track` beacon. Exclude `/api/track` at minimum.
- **`127.0.0.1:3000` is broken** (`middleware.ts:46-48`): `"127.0.0.1".split(".")[0]` → `"127"` → the whole app rewrites to `/site/127`. Breaks Docker, Codespaces, LAN testing.
- **Any non-root host is treated as a custom domain** (`:56-59`), so `/` 404s on Vercel previews, staging, and `www`-less alternates. Add an explicit app-host allow-list.
- `NextResponse.rewrite` at `:66-68` omits `{ request }`, so cookie refreshes from `updateSession` aren't forwarded downstream — refreshed sessions can read stale tokens.
- `middleware.ts` is the **deprecated convention in Next 16**; rename to `proxy.ts` and clear the build warning.
- Switch `NEXT_PUBLIC_ROOT_DOMAIN` (client-exposed) to a server-only `ROOT_DOMAIN` for routing decisions.

### 6.4 Images
Six raw `<img>` tags with `@next/next/no-img-element` suppressions → no optimization, no lazy loading, no dimensions, so **CLS** and full R2 egress cost. Migrate to `next/image` with `remotePatterns` for the R2 domain. Add width/height everywhere.

### 6.5 Lenis is global
`app/layout.tsx:33` wraps **everything** in smooth scroll, including the editor's split panes which rely on native `overflow-y: auto` (`live-preview.tsx:60`, `editor-panel.tsx:241`). Scrolling fights itself. Scope it to the marketing page only, and respect `prefers-reduced-motion`.

### 6.6 Soft 404
`site/[slug]/page.tsx:146-166` returns **HTTP 200** with "Page Not Published Yet" for non-owners. Crawlers index that. Return `notFound()` — and `notFound` is already imported at line 1 but never called.

**Done when:** Lighthouse on a published customer site reports LCP < 1.5 s; a public page view makes exactly one cached DB query.

---

# Phase 7 — Product completeness

**Goal: ship the thing your customers actually came for.**

### 7.1 Templates — your stated differentiator vs. quicklaunch.tech
There is **no template system.** The only starting point is the hardcoded `defaultContent` object in `app/api/sites/route.ts:91-135`. Your competitive edge is "major customization + templates," and templates do not exist.

- `templates` table: `id`, `name`, `category`, `description`, `preview_images[]`, `content` (the same shape as `sites.content`), `is_active`, `sort_order`.
- A `/templates` gallery and a picker in `create-site-dialog.tsx`. Creating a site from a template writes the template's `content`.
- Share `SiteContent` between template and site so the editor needs no changes.
- **Parity requirement:** the zero-drift guarantee. A template's preview and its published page must render from `site-renderer.tsx` unchanged.

### 7.2 Editor defects that lose work
- **No unsaved-changes guard** (`editor-view.tsx`). Clicking back to the dashboard discards every edit. No `beforeunload`, no confirmation on internal navigation.
- **No autosave.** The user must remember "Save Draft."
- **Hidden file inputs are never reset** (`editor-panel.tsx:159,175`) — **you cannot select the same file twice in a row.** A very visible bug.
- **No prop→state sync** (`editor-view.tsx:26-27`) — after `router.refresh()` the server sends new props that local state ignores.
- **No publish validation or confirmation.** You can publish with `legal_links = "#"` and store links pointing at Apple's homepage.
- **Live preview is hidden below `md`** (`editor-view.tsx:193`) — no preview on tablet or mobile, and the device toggle is unreachable.
- `features` has no max, min, or drag reorder. `id: feat-${Date.now()}` (`:200`) collides on rapid double-add.
- `AVAILABLE_ICONS` (`:31-42`) and `iconMap` (`site-renderer.tsx:28-39`) are two hand-synced lists. Extract one constant — currently adding an icon to one list silently falls back to `Sparkles`.
- `PUT` has **no optimistic concurrency** — two tabs silently clobber each other. Add an `updated_at`/`version` check.

### 7.3 Accessibility (roughly 15 defects)
- **The dashboard is unnavigable on mobile.** `dashboard-nav.tsx:58` is `hidden md:flex` — there is no hamburger, so on a phone the *only* way to reach analytics or billing is a direct URL.
- **No `htmlFor`/`id` on a single editor input** (`editor-panel.tsx` throughout) — every field is unlabelled to screen readers.
- **No `role="dialog"`, `aria-modal`, focus trap, Escape-to-close, or backdrop click on any modal** (`create-site-dialog.tsx`, `site-card.tsx:174-211`).
- No `aria-live` on toasts or banners; no `:focus-visible` styling; no reduced-motion handling; no skip link.
- Screenshot carousel (`site-renderer.tsx:346-360`) has no arrows, dots, drag, or keyboard support.

### 7.4 Other missing product surface
- **No forgot-password flow.** `login/page.tsx:140-148` is an empty flex row with only a label — a planned feature abandoned mid-implementation. **No password reset exists anywhere in the app.**
- **No `legal_links` editor** — but the section is labelled "Footer & Legal" (`editor-panel.tsx:236`) and the links are rendered publicly (`site-renderer.tsx:419-428`). Users are stuck with the seeded `#` placeholders.
- **No ToS / Privacy / Imprint pages** — required for a paid service, and the footer links are `#`.
- **No `robots.ts`, `sitemap.ts`, or `manifest`** per customer site, and **no favicon per customer site** — a product whose output must rank in search.
- **No JSON-LD** (`SoftwareApplication`, `WebSite`). Big SEO miss.
- No dark-mode toggle — `dark:` is `prefers-color-scheme` only, and `globals.css` has a second, dead CSS-variable dark strategy.
- No account deletion or data export (GDPR/CCPA).
- No transactional email (receipts, password reset, publish notifications).
- No admin panel.

**Done when:** a new user can sign up, pick a template, customize every field including legal links, publish, and get a working page with real analytics and a working cancel — on a phone, with a screen reader.

---

# Phase 8 — Quality gates

**Goal: none of the above regresses.**

The repo currently has **zero tests, zero CI, and a `lint` script with no `--max-warnings=0`.** Fourteen unused imports and twenty-seven `any`s shipped because nothing checked. That is the systemic reason this audit was necessary.

### 8.1 Unit tests (Vitest)
Highest-value targets, each of which would have caught a shipped bug:
- **Slug sanitization and reserved-word rejection** (two divergent copies exist today).
- **The `onConflict: "site_id"` upsert** — the guaranteed-failure bug.
- **The webhook state machine**, including cancel-honors-period-end and idempotent replay.
- **`safeRedirectPath()`** against `//evil.com`, `https://evil.com`, `javascript:`, `/\\evil.com`, encoded variants.
- **The middleware subdomain/custom-domain branch**, including `127.0.0.1`, `www`, preview hosts, and IDN.
- **The `SiteContent` Zod schema** against size, depth, and URL-scheme limits.
- **Analytics aggregation** — timezone bucketing and referrer attribution.

### 8.2 E2E (Playwright)
Signup → create from template → edit → publish → view on subdomain → connect custom domain → upgrade → cancel.

### 8.3 Visual regression — your core promise
Screenshot the published page and the editor preview for several representative sites and assert they are pixel-identical. This is the only test that actually protects the zero-drift guarantee that differentiates you from every competitor.

### 8.4 CI (`.github/workflows/`)
`npm ci` → `typecheck` → `lint --max-warnings=0` → `test` → `build` → migration-check (`supabase db diff` must be empty). Gate on `main`. Add Husky + lint-staged + Prettier for a local pre-commit gate.

**Done when:** CI is green on `main` and a deliberately introduced bug fails it.

---

# Phase 9 — Production operations

### 9.1 Containerize
- Multi-stage `Dockerfile` → `output: "standalone"` → minimal runtime image, non-root `USER`, `.dockerignore`.
- `docker-compose.yml`: `caddy`, `app`, `redis`. `restart: unless-stopped`, healthchecks, named volumes.
- Deployable on EC2 via `docker compose up -d`, systemd, or SSM.

### 9.2 Error boundaries and observability
- `app/error.tsx`, `app/global-error.tsx`, `not-found.tsx`, `loading.tsx` skeletons in every segment. **Zero exist today**, and `createAdminClient()` throwing at `site/[slug]/page.tsx:18` takes down every public page with an unhandled 500.
- `app/loading.tsx` — every dashboard page currently blocks on 2–3 sequential Supabase round-trips behind a blank screen.
- **Structured logger** replacing 8 raw `console.*` calls with request IDs, user IDs, and durations. `api/sites`, `api/sites/[id]`, and `api/upload` have **zero** logging; `domains/route.ts`'s DELETE catch has none either.
- **Error tracking** (Sentry) + `instrumentation.ts`.
- **`/api/health`** — liveness + readiness, including a real DB ping.

### 9.3 Runbooks (none exist)
- Deploy and rollback.
- **Backup/restore for Supabase** — you have no documented recovery path for the database holding every customer's site content.
- On-call: what to do when the webhook stops firing, when cert issuance fails, when R2 bills spike.
- Incident: how to disable a leaking plan feature without a deploy.

**Done when:** you can restore the database from backup and you can find out a failed webhook from a log query.

---

# Phase 10 — EC2 + edge infrastructure

### 10.1 Topology
```
Internet → Caddy (:80/:443, TLS) → Next.js standalone (:3000)
                                         ↓
                        Supabase (managed) · R2 (managed) · Dodo (SaaS)
Caddy ← /caddy/ask (on-demand TLS) → app → Supabase
Redis (rate limits) · app → Redis
```

### 10.2 Decisions
- **EC2 sizing:** t3.medium / t3.large with 20 GB gp3 to start. The app is I/O-bound on Supabase, not CPU-bound — you can scale the app containers horizontally without limit. Put a CDN in front of the **published sites** (Cloudflare free tier) so customer traffic never touches EC2. **Do not put the dashboard behind it** — the app is authenticated.
- **Rate limiting store:** Redis on the same box for v1, ElastiCache or Upstash when you outgrow it.
- **Backup the EC2 config** (Caddyfile, compose) in git. The database is not on this box — that is a feature.
- **Secrets:** never in the image or compose file. `.env` on the host with `chmod 600`, or EC2 SSM Parameter Store.

### 10.3 Go-live checklist
- [ ] Phases 0–9 complete
- [ ] `*.root` A record → EC2 IP
- [ ] Caddy wildcard cert issued and auto-renewing (verify by watching two renewal cycles)
- [ ] Custom domain tested end-to-end on a real registered domain
- [ ] Real Dodo live-mode purchase → webhook → verified upgrade
- [ ] A production-mode attempt to forge a webhook → 503
- [ ] Legal pages live, ToS accepted at signup
- [ ] Sentry alerts on, `/api/health` monitored
- [ ] Backup/restore rehearsed once
- [ ] Load test at 10× expected peak

---

## Ordering rationale

Security before features because **two of the P0 holes are directly monetizable by an attacker** — unauthenticated Pro grants and plan escalation. Data layer next because generated types and DB constraints are what prevent the next silent-bug class, and because the domain and billing work both depend on the schema. Custom domains and billing before analytics, since those carry the revenue. Performance before polish, because it is the difference between a working product and a viable one. Tests after, so they lock in correct behaviour rather than codify bugs.

## Effort estimate

Phases 0–2: ~1 week (the boring, non-negotiable foundation).
Phase 3 (domains): ~1 week — the only genuinely new infrastructure.
Phase 4 (billing): ~4 days, mostly verifying real Dodo event shapes.
Phase 5 (analytics): ~3 days. Phase 6 (performance): ~4 days.
Phase 7 (templates + product): ~2 weeks — the largest remaining chunk, and where your differentiation lives.
Phase 8 (tests/CI): ~1 week. Phase 9 (ops): ~3 days. Phase 10: ~2 days + DNS propagation.

**Roughly 6 weeks solo to a defensible production launch**, with templates as the only item that is genuinely additive rather than corrective.
