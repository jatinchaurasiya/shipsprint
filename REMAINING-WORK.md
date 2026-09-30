# ShipSprint — Remaining Work

Complete list of everything left, in dependency order. Each item states what
is wrong, what "done" means, and roughly how long it takes.

Status legend: ✅ done · ⛔ blocker · ⚠️ required before launch · 🔵 later

---

## Current state

```
npm run typecheck   pass
npm run lint        pass  (0 errors, 0 warnings)
npm run build       pass
npm run test        57 passed
npm run db:validate pass
```

The application compiles, lints, tests, and builds. It is **not yet
deployable** — the database has not been migrated, the DNS does not exist, and
`.env.local` contains no credentials.

---

# ⛔ BLOCKERS — you must do these

## B1. Apply the database schema

**Status:** ⛔ Not done. Your last attempt failed with
`column "tagline" of relation "plans" does not exist`; that has been fixed.

**Do:** Supabase → SQL Editor → New query → paste `supabase/schema.sql` → Run.

Then scroll to **section 17** and uncomment the four `UPDATE` statements with
your real Dodo product ids:

```sql
update public.products set dodo_product_id = 'pdt_...' where id = 'basic_monthly';
update public.products set dodo_product_id = 'pdt_...' where id = 'basic_yearly';
update public.products set dodo_product_id = 'pdt_...' where id = 'pro_monthly';
update public.products set dodo_product_id = 'pdt_...' where id = 'pro_yearly';
```

**Done when** the verification query returns:

| object | rows |
|---|---|
| plans | 3 |
| products | 4 |
| templates | 0 |
| site_analytics% views | 3 |

And all four products show a non-null `dodo_product_id`.

**Why the first attempt failed, and why it will work now:**
`CREATE TABLE IF NOT EXISTS` is not idempotent — when the table exists,
Postgres skips the statement *including the column list*. Your `plans` table
already existed from the initial migration without `tagline`, so the CREATE did
nothing and the next INSERT referenced a column nobody had added. The script
now runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for every addable column,
plus a data-migration step before the CHECK constraints (your existing rows use
the old `status='pending'` vocabulary, which the new constraints reject).

**Safety:** the script is wrapped in `begin`/`commit`. If it fails, everything
rolls back and your database is untouched.

**Verify locally first:** `npm run db:validate` — parses the SQL with a real
PostgreSQL parser and asserts the convergence properties.

**Time:** 5 minutes.

---

## B2. Populate `.env.local`

**Status:** ⛔ Every secret is currently `EMPTY`.

Keys exist, values do not. Required:

```
NEXT_PUBLIC_SUPABASE_URL=         # Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase → Settings → API → anon public
SUPABASE_SERVICE_ROLE_KEY=        # Supabase → Settings → API → service_role
DODO_PAYMENTS_API_KEY=            # Dodo → Developers → API keys
DODO_PAYMENTS_WEBHOOK_KEY=        # Dodo → Webhooks → the secret it generates
R2_ACCOUNT_ID=                    # Cloudflare → R2 → Account ID
R2_ACCESS_KEY_ID=                 # Cloudflare → R2 → Manage R2 Tokens
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
CRON_SECRET=                      # openssl rand -hex 32
ACME_CONTACT_EMAIL=               # receives Let's Encrypt expiry notices
CF_API_TOKEN=                     # Cloudflare API token, for DNS-01
```

**Delete these six** — product ids moved into the `products` table:

```
DODO_PRODUCT_ID_BASIC
DODO_PRODUCT_ID_PRO
DODO_PRODUCT_ID_BASIC_MONTHLY
DODO_PRODUCT_ID_BASIC_YEARLY
DODO_PRODUCT_ID_PRO_MONTHLY
DODO_PRODUCT_ID_PRO_YEARLY
```

**Done when** `curl localhost:3000/api/health` reports `"status":"healthy"`.

**Never commit this file.** `.env*` is gitignored and `!.env.example` re-permits
only the template.

---

## B3. Register the Dodo webhook

**URL:**

```
https://shipsprint.site/api/billing/webhook
```

Dodo Dashboard → **Webhooks** → Add endpoint. Toggle **Disabled** off. Copy the
generated secret into `DODO_PAYWEBHOOK_KEY`.

Subscribe to: `subscription.active`, `subscription.renewed`, `subscription.updated`,
`subscription.unpaused`, `payment.succeeded`, `payment.failed`,
`subscription.past_due`, `subscription.on_hold`, `dunning.started`,
`subscription.cancelled`, `subscription.expired`, `subscription.plan_changed`.

**This is not optional.** Without the secret the endpoint returns 503 and
processes nothing — deliberate, because the previous implementation fell back
to `JSON.parse` when the key was absent, letting anyone grant themselves Pro.

**Done when** a test-mode purchase produces a row here:

```sql
select event_type, processed, note, received_at
from public.webhook_events order by received_at desc limit 5;
```

`processed = true` with a `note` is the only proof an upgrade happened. Trust
that, not the browser.

**Time:** 10 minutes.

---

## B4. DNS on Hostinger

**Status:** ⛔ Not done.

hPanel → Website → Domains → Manage `shipsprint.site` → **DNS zone**. Three `A`
records, all to your server IP:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | your IP |
| `A` | `*` | your IP |
| `A` | `cname` | your IP |

Full walkthrough with the two traps: **[docs/DNS-SETUP.md](docs/DNS-SETUP.md)**

**Do NOT add a `www` record** — Caddy already redirects it. Two records for one
host is invalid and produces an undiagnosable certificate error.

**Do NOT delete your email records** (`@` MX, `imap`, `smtp`, `_dmarc`).

**Done when** this resolves:

```bash
dig +short test.shipsprint.site
```

If it does not resolve, free subdomains cannot work at all. Check that first.

Also required: EC2 security group must allow inbound **TCP 80** and **TCP 443**.

**Time:** 15 minutes.

---

## B5. Supabase auth redirect URLs

**Status:** ⛔ Not done. Without it, clicking a confirmation email **fails** —
a worse first impression than a missing avatar.

Supabase → Authentication → URL Configuration → Redirect URLs:

```
https://shipsprint.site/auth/callback
https://www.shipsprint.site/auth/callback
http://localhost:3000/auth/callback
http://*.localhost:3000/auth/callback
```

Add your staging host too.

**Time:** 5 minutes.

---

# ⚠️ REQUIRED BEFORE LAUNCH

## R1. Generated database types — the highest-leverage remaining item

**Status:** Not done. `types/database.ts` is still hand-written and every query
is `as`-cast.

This is the **root cause** of the worst bug in the original codebase: the
`onConflict: "site_id"` failure shipped because nothing verified code against
the schema. `as Plan`, `as Site`, `as Profile` casts mean a column rename is
invisible to the compiler.

**Do** (after B1):

```bash
npx supabase login          # one-time, interactive — I cannot do this for you
npm run db:apply            # generates types/database.generated.ts
```

Then replace `types/database.ts` with the generated definitions and delete
every `as` cast. Missing rows become real type errors or explicit `notFound()`.

**Done when** `grep -rn "as Plan\|as Site\|as Profile" app/` returns nothing.

**Time:** 1 hour.

---

## R2. Analytics dashboard still aggregates in the browser

**Status:** ⚠️ The SQL views exist and are **unused**.

`app/(dashboard)/dashboard/analytics/page.tsx` still fetches up to 1000 raw
events with the service-role key and aggregates them in a React `useMemo`.
Past 1000 events the numbers are silently wrong, and the whole event set is
serialized into the RSC payload.

**Do:** query `site_analytics_summary`, `site_analytics_sources` and
`site_analytics_cta`. RLS is `security_invoker` so the user's own client can
read them — **delete the `createAdminClient()` call at line 46**, which means a
missing service-role key currently 500s the page for every Pro user for no
benefit.

Also fix: the bar chart's `Math.max(8, ...)` renders zero-traffic days as
visible bars, and the hardcoded fake metrics in the Pro upsell
(4,289 views / 24.4% CTR) will be screenshotted as real data — label them.

**Time:** 1 day.

---

## R3. Templates — your stated differentiator does not exist

**Status:** ⚠️ `templates` table exists. No gallery, no picker, no UI.

Against quicklaunch.tech your stated edge is *"major customization plus
templates"*. Right now the only starting content is a hardcoded object in
`app/api/sites/route.ts:91-135`.

**Do:**

- `/templates` gallery, readable pre-signup (RLS already allows anon SELECT)
- Picker in `create-site-dialog.tsx`
- `POST /api/sites` accepts `template_id`; the row is created from the
  template's `content`, and `sites.template_id` records which one
- Seed 4–6 templates. Reuse `SiteContent`, so the editor needs no changes

**Parity requirement:** a template preview and its published page must render
through the same `site-renderer.tsx`. That is the zero-drift promise, and it
needs a visual regression test (R7).

**Time:** 1–2 weeks. The largest remaining chunk and the only genuinely
additive one.

---

## R4. Legal pages and signup consent

**Status:** ⚠️ Missing entirely. Footer links are `#`.

- `/terms`, `/privacy`, `/imprint`
- ToS checkbox at signup — legally required in many jurisdictions for paid SaaS
- Link the real pages from the published-site footer instead of the seeded `#`

**Time:** 4 hours. Do it with a template; do not pay a lawyer for v1.

---

## R5. Password reset

**Status:** ⚠️ Planned and abandoned. `login/page.tsx:140-148` is an empty flex
row with only a `<label>`. No reset flow exists anywhere.

Add `POST /api/auth/reset` + `supabase.auth.resetPasswordForEmail` + a
`/reset-password` route consuming the recovery session.

**Time:** 2 hours.

---

## R6. Observability

**Status:** ⚠️ Structured logging exists (`lib/logger.ts`) but nothing consumes
it. No error tracking, no alerting.

- `@sentry/nextjs` + `instrumentation.ts`
- Alert on: webhook failures, cert issuance failure, R2 error rate,
  `/api/health` non-200
- Uptime monitor on `/api/health`

**Time:** half a day.

---

## R7. Visual regression on the zero-drift guarantee

**Status:** ⚠️ Nothing protects your core product promise.

**Do:** Playwright screenshots of the published page and the editor preview for
several sites; assert they are identical. This is the only test that catches
the preview drifting from reality.

**Time:** half a day, and it prevents an entire class of bug.

---

# 🔵 PERFORMANCE

## P1. Double database query on every public page view — highest impact

**Status:** Not done.

`app/site/[slug]/page.tsx` calls `getSiteBySlugOrDomain()` **twice** per
request — once in `generateMetadata`, once in the page. Two **uncached
service-role** Postgres round-trips on every view of every published site. No
`revalidate`, no cache, no CDN.

**Do:**

- Deduplicate with React `cache()` so metadata and page share one fetch
- Wrap in `unstable_cache` with a per-site tag; call `revalidateTag` on save
- Stop querying drafts with the service-role key — draft headlines are currently
  emitted into `<head>` for non-owners

**Done when:** a published page view makes exactly one cached query; Lighthouse
LCP < 1.5 s.

**Time:** 4 hours.

---

## P2. The renderer is a client component

**Status:** Not done.

`components/renderer/site-renderer.tsx:1` is `"use client"`, so your entire
public SEO surface ships as a client bundle and renders nothing until
hydration. For a product whose output must rank, this is the wrong trade.

**Do:** convert to a Server Component; isolate the analytics beacon and CTA
click handlers into small client islands. Also enables next/image for
optimisation and lazy loading.

**Do not** do this before R2 — the beacon logic is entangled with the analytics
work.

**Time:** 1 day.

---

## P3. Images

Six raw `<img>` tags carry `@next/next/no-img-element` suppressions. No
optimisation, no lazy loading, no dimensions → CLS, and full R2 egress cost.

`next/image` is already configured with `remotePatterns`.

**Time:** 3 hours.

---

## P4. Lenis is global

`app/layout.tsx:33` wraps everything, including the editor's split panes which
rely on native `overflow-y: auto`. Scrolling fights itself.

**Do:** scope to the marketing page only. `prefers-reduced-motion` is now
honoured in CSS but Lenis needs its own check.

**Time:** 1 hour.

---

# 🔵 EDITOR AND UX

## U1. Data loss risks

**Status:** Not done. These lose customer work.

- **No unsaved-changes guard.** Clicking back to the dashboard discards every
  edit. No `beforeunload`, no confirmation on internal navigation.
- **No autosave.** The user must remember "Save Draft".
- **No prop→state sync.** After `router.refresh()` the server sends new props
  that local state ignores.
- **Hidden file inputs are never reset** (`editor-panel.tsx:159,175`) — **you
  cannot select the same file twice in a row.**

**Time:** 1 day.

## U2. Mobile navigation is missing entirely

`dashboard-nav.tsx` is `hidden md:flex` with no hamburger. **On a phone the
only way to reach analytics or billing is a direct URL.**

The live preview is also hidden below `md`, so tablet and mobile editors have
no preview at all and cannot reach the device toggle.

**Time:** half a day.

## U3. Accessibility — roughly 15 defects

- **No `htmlFor`/`id` on a single editor input.** Every field is unlabelled to
  screen readers.
- **No `role="dialog"`, `aria-modal`, focus trap, Escape-to-close, or backdrop
  click** on any modal.
- Screenshot carousel has no arrows, dots, drag, or keyboard support.
- No `aria-live` on toasts; no skip link.

**Time:** 1 day.

## U4. Missing product surface

- Email capture — the `has_email_capture` flag exists on every plan but nothing
  implements it
- Site `robots.txt` / `sitemap.xml` per customer site. A product whose output
  must rank in search, with no sitemap.
- JSON-LD (`SoftwareApplication`, `WebSite`) — a significant SEO miss
- Dark-mode toggle — `dark:` is `prefers-color-scheme` only
- Account deletion / data export (GDPR/CCPA)

**Time:** 2 days.

---

# 🔵 BILLING

## B-1. Downgrade and cancel in-app

**Status:** ⚠️ Partially. The portal works, but there is no in-app downgrade.

`POST /api/billing/checkout` rejects any plan at or below the current tier, so
there is no Pro → Basic path in the app. Users must use the Dodo portal.

**Do:** allow a lower-tier purchase, prorate through the provider, and set
`cancel_at_period_end` rather than cancelling immediately.

**Time:** 4 hours.

## B-2. Pricing copy over-promises

**Status:** ⚠️ On the live pricing page.

- Basic claims *"Custom app color accent themes"* — there is no theme system;
  `sites.theme` is a dead column.
- Pro claims *"Priority 24/7 maker support"* — there is no support channel.
- Custom domains are described as *"Automatic Zero-Touch Let's Encrypt TLS"*.

The last one is now roughly true (Caddy on-demand TLS), but the first two are
chargeback bait.

**Time:** 30 minutes.

## B-3. No transactional email

No receipts, no password reset, no publish notifications. Dodo as
merchant-of-record may cover receipts, but not the rest.

**Time:** half a day (Resend).

---

# 🔵 HOUSEKEEPING

## H1. README

**Status:** ⚠️ Still the verbatim `create-next-app` template. It tells readers to
"start editing the page by modifying `app/page.tsx`" and mentions none of
Supabase, R2, Dodo, the 15 env vars, the subdomain architecture, or deployment.

**Time:** 2 hours.

## H2. `.gitignore` is missing Supabase local state

`supabase/.temp/` is currently untracked and would be committed.

Add before committing:

```
supabase/.temp/
supabase/.branches/
```

## H3. First commit

Nothing is committed. 45 modified, 40 new files, 5 deleted.

Before committing: run `npm run check` and `npm run test`. The repo also has
LF/CRLF warnings on 12 files — not a problem, but worth knowing.

**Time:** 10 minutes.

---

# Effort summary

| Block | Estimate |
|---|---|
| ⛔ Blockers B1–B5 | ~1 hour, all of it you |
| ⚠️ R1 generated types | 1 hour |
| ⚠️ R2 analytics wiring | 1 day |
| ⚠️ R3 **templates** | 1–2 weeks |
| ⚠️ R4–R6 legal, reset, observability | 2 days |
| ⚠️ R7 visual regression | half a day |
| 🔵 P1–P4 performance | 2 days |
| 🔵 U1–U4 editor, a11y, product | 4 days |
| 🔵 Billing gaps | 1 day |
| 🔵 Housekeeping | half a day |

**≈ 3 weeks of feature work, of which templates is more than half.**

The ordering is deliberate: security before features (two holes were
monetizable), data layer before everything that touches it, revenue paths
before polish. Templates is last because it is the only item that is additive
rather than corrective — and it is what makes you meaningfully different from
quicklaunch.tech, so it deserves to be done well rather than first.
