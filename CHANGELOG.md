# Changelog — all changes made

Complete record of every change to the codebase, from the half-finished state
at commit `abce4b4` to now. Nothing here is committed yet.

**Diff summary:** 45 files modified, 1,449 lines removed, 4,272 added.
**40 new files**, 5,686 lines. 5 files deleted.

Verification at time of writing:

```
npm run typecheck   pass
npm run lint        pass  (0 errors, 0 warnings)
npm run build       pass
npm run test        57 passed
npm run db:validate pass  (191 statements parse, all convergence assertions)
```

---

## C1 — Lock `profiles.plan_id` (free plan escalation)

**Severity:** CRITICAL · **Audit ref:** `audit/C1-plan-escalation.md`

**The hole.** `authenticated` held a table-wide `UPDATE` grant on
`public.profiles` plus a permissive `"Users can update own profile"` policy.
Because the Supabase anon key is public and every user gets a session JWT, any
signed-up user could run
`PATCH /rest/v1/profiles?id=eq.<uid> {"plan_id":"pro"}` and grant themselves
Pro — 10 sites, custom domains, analytics, AI discovery — without paying.

**The fix (defence in depth, both layers):**

1. **No client writes.** `supabase/migrations/012_lock_profile_plan.sql`
   revokes `insert, update, delete` on `public.profiles` from `anon` and
   `authenticated` and grants only `SELECT`. The permissive UPDATE policy is
   dropped. No app code writes profiles with the user client — every
   legitimate write (checkout, billing webhook, dev simulator) already uses the
   service-role client, verified by a static test.
2. **Immutability trigger.** `guard_profile_plan()` (SECURITY DEFINER, pinned
   `search_path`) refuses `plan_id` / `dodo_customer_id` changes from any
   session role that is not a trusted billing/ops role. It checks **both**
   `current_setting('role')` (PostgREST's `SET ROLE service_role` /
   `authenticated`) **and** `session_user` (the login role; a plain
   `postgres` session reports `role = 'none'`). `current_user` is deliberately
   not used — inside a SECURITY DEFINER function it is always the owner, which
   would make the guard a no-op.
3. **Self-verification.** The migration ends with a `DO` block that fails if
   the client UPDATE grant, the permissive policy, or the guard trigger is
   missing.
4. **Mirrored** into `supabase/schema.sql` and `production.sql` so fresh
   installs and the duplicate production script cannot drift.
5. **CI enforcement:** `scripts/validate_schema.py` asserts the grant is
   revoked, the policy is gone, and the guard is SECURITY DEFINER + pinned
   `search_path` + tests both `current_setting('role')` and `session_user`.
   `tests/profile-plan-guard.test.ts` (11 tests) locks the schema, the
   migration, and the app's use of the admin client.

**Verification.**

```
python scripts/validate_schema.py   pass (all C1 assertions)
npm run typecheck                   pass
npm run lint                        pass
npm run test                        303 passed (23 files)
npm run build                       pass
```

Functional proof against a throwaway PostgreSQL 16 cluster, applying the real
`012_lock_profile_plan.sql` and simulating PostgREST (`authenticator` →
`SET ROLE`) and direct admin (`postgres`) access — **33/33 checks pass**:

- PostgREST `authenticated` UPDATE → `permission denied`
- PostgREST `authenticated` INSERT → `permission denied`
- PostgREST `service_role` UPDATE plan + customer → allowed (webhook path)
- PostgREST `authenticated` UPDATE with a mistaken re-grant → blocked by the
  trigger (`Plan changes are managed by billing`)
- `dodo_customer_id` change → blocked by the trigger
- `updated_at` update → allowed
- `postgres` (SQL editor / migrations) UPDATE plan → allowed
- self-verification DO block → passes
- owner SELECT policy retained

**Deploy step (required):** apply
`supabase/migrations/012_lock_profile_plan.sql` to the production database
(Supabase SQL editor or `supabase db push`). The migration self-verifies and
fails loudly if the lock is incomplete. Then re-run the post-apply checks at
the bottom of the migration file.

---

## C2 — Lock analytics maintenance functions (anonymous data destruction)

**Severity:** CRITICAL · **Audit ref:** `audit/C2-anon-rpc-data-loss.md`

**The hole.** `prune_analytics(integer)` and `rollup_telemetry(integer)` are
`SECURITY DEFINER` functions (they run as their owner and bypass RLS), and
there was **no `revoke execute`** anywhere. PostgreSQL grants `EXECUTE` on
functions to `PUBLIC` by default, and Supabase exposes public-schema functions
over PostgREST RPC, so anyone holding the public anon key could call:

```bash
curl -X POST "https://<project>.supabase.co/rest/v1/rpc/prune_analytics" \
  -H "apikey: <public anon key>" -H "Content-Type: application/json" \
  -d '{"p_days": 100000}'
```

That deletes **every analytics event for every tenant**. `rollup_telemetry`
can likewise poison `telemetry_daily` or force expensive re-aggregation.

**The fix (defence in depth + convergence enforcement):**

1. **No client execute.** `supabase/migrations/013_lock_analytics_functions.sql`
   revokes `EXECUTE` on `prune_analytics(integer)` and `rollup_telemetry(integer)`
   from `public`, `anon` and `authenticated`, and grants it to `service_role`
   only. The maintenance cron already uses the service-role client.
2. **Trigger functions locked too.** `set_updated_at()`, `guard_profile_plan()`,
   `enforce_site_limit()`, `reject_reserved_slug()` and `handle_new_user()` are
   internal; their `EXECUTE` is revoked from clients (triggers still fire —
   verified functionally).
3. **`get_platform_metrics()` stays public.** It returns only aggregate counts
   and is used by the marketing homepage with the anon client.
4. **Self-verification.** The migration ends with a `DO` block that fails if
   anon/authenticated can still execute either function, if service_role cannot,
   if `get_platform_metrics()` lost its anon grant, or if either function's
   `search_path` is not pinned. It also `NOTIFY pgrst, 'reload schema'` so
   PostgREST drops the old privileges immediately.
5. **Mirrored** into `supabase/schema.sql` and `production.sql`.
6. **CI enforcement:** `scripts/validate_schema.py` section 6c asserts the
   revokes/grants, and — generically — that **every** `SECURITY DEFINER`
   function in `schema.sql` is locked except the intentional public
   `get_platform_metrics()`. `tests/analytics-rpc-guard.test.ts` locks the
   schema, the migration, and the app's client usage (cron = admin, homepage =
   anon).

**Verification.**

```
python scripts/validate_schema.py   pass (section 6c + generic SECURITY DEFINER scan)
npm run typecheck                   pass
npm run lint                        pass
npm run test                        314 passed (24 files)
npm run build                       pass
```

Functional proof against a throwaway PostgreSQL 16 cluster, applying the real
`013_lock_analytics_functions.sql` twice (idempotency) with Supabase-like
roles (`authenticator` login → `SET ROLE anon|authenticated|service_role`) and
`PUBLIC` execute granted — **25/25 checks pass**:

- `anon` / `authenticated` → `permission denied` on both functions
- `service_role` → allowed; `prune_analytics` actually deletes, `rollup` writes
- `postgres` (SQL editor) → allowed
- `get_platform_metrics()` → anon allowed (homepage)
- `search_path` pinned on both functions
- revoking `EXECUTE` on trigger functions does **not** stop them firing

**Deploy step (required):** apply
`supabase/migrations/013_lock_analytics_functions.sql` to the production
database, then verify with the post-apply checks at the bottom of the file.

---

## C3 — Eliminate stored XSS in the markdown renderer

**Severity:** CRITICAL · **Audit ref:** `audit/C3-markdown-xss.md`

**The hole.** `components/renderer/page-renderer.tsx` rendered page bodies and
blog posts with `dangerouslySetInnerHTML` and a `formatInline()` helper that
performed **no HTML escaping**:

```ts
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong ...>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em ...>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" ...>$1</a>');
}
```

Any site owner (free tier included) could put
`<img src=x onerror=...>` or `[x](javascript:...)` in a page body or blog
post. Because the Supabase session cookie is scoped to the apex domain
(`.shipsprint.site`) and is not `httpOnly`, script on any customer page could
steal the session of any logged-in ShipSprint user — full account takeover.
The generated legal pages also interpolated the brand name into paragraphs
that flowed through the same sink.

**The fix — remove the sink entirely, not filter it.**

1. **`lib/markdown.ts`** (new, pure/isomorphic): a small markdown parser that
   returns a **token tree** (`text` / `strong` / `em` / `link` / `heading` /
   `paragraph` / `list` / `hr`). It never builds an HTML string. Link targets
   go through `safeMarkdownHref()`, which allows only `http:`, `https:`,
   `mailto:`, `tel:`, root-relative paths and `#anchors`; `javascript:`,
   `data:`, `vbscript:`, `file:`, `blob:`, protocol-relative, backslash and
   quote/control-character payloads all become `#`.
2. **`components/renderer/markdown-viewer.tsx`** (new): maps the token tree to
   React elements. **No `dangerouslySetInnerHTML`, no `innerHTML`** — React
   escapes every text node and attribute by construction, so there is no
   injection sink left to get wrong.
3. **`page-renderer.tsx`**: the old `MarkdownViewer` + `formatInline` are
   deleted; store links now go through `safeHref()` as defence in depth for
   rows written before validation existed.
4. **`tests/markdown-renderer.test.tsx`** (new, 18 tests): pure parser tests
   plus real `renderToStaticMarkup` assertions against an XSS corpus
   (`<img onerror>`, `javascript:`, `data:text/html`, `vbscript:`, attribute
   breakout, malicious brand names in generated legal pages) and positive
   cases (http/https/mailto/tel/relative links, bold/italic/headings/lists).

**Verification.**

```
npm run typecheck   pass
npm run lint        pass
npm run test        332 passed (25 files; 18 new)
npm run build       pass
```

No database change is required — this is an application-code fix. The next
production deploy rebuilds the app with the safe renderer.

**Post-deploy verification:** publish a test page whose body contains
`<img src=x onerror=alert(1)>` and `[x](javascript:alert(1))`, open the live
URL, and confirm the text renders inertly (no `alert`, no image tag) and the
link is `#`.

---

## C4 — Close the open-redirect control-character bypass

**Severity:** HIGH · **Audit ref:** `audit/C4-open-redirect.md`

**The hole.** `lib/redirect.ts` `safeRedirectPath()` blocked `//`, `/\`,
`\`, `scheme:` and `%2f`/`%5c`, but **not ASCII control characters**. The
WHATWG URL parser strips `\t`, `\n` and `\r` from **anywhere** in a URL, and
`trim()` only removes leading/trailing whitespace — so an *interior* tab
survived and `"/\t/evil.com"` was parsed as `"//evil.com"`:

```
safeRedirectPath("/\t/evil.com")  ->  "/\t/evil.com"  (allowed)
new URL("/\t/evil.com", "https://shipsprint.site")  ->  https://evil.com/
```

Reachable sinks: the email-confirmation callback
(`app/(auth)/auth/callback/route.ts`), the proxy's already-signed-in bounce
(`proxy.ts`), and the login page's `router.push(next)`. A crafted
`https://shipsprint.site/auth/callback?next=%2F%09%2Fevil.com` link would
redirect the user to an attacker site **after** a trusted ShipSprint email —
a ready-made phishing primitive. The existing 39 tests all passed because none
used control characters.

**The fix.**

1. **`lib/redirect.ts`** — `safeRedirectPath()` now rejects:
   - any C0 control (U+0000–U+001F) or DEL (U+007F) anywhere in the value
     (explicit code-point loop; avoids the `no-control-regex` lint rule);
   - percent-encoded path separators/controls (`%2f`, `%5c`, `%09`, `%0a`,
     `%0d`) in the **path portion** (query/hash values remain exempt so a
     legitimate `?next=%2Ffoo` still works);
   - plus the existing `//`, `/\`, `\`, `scheme:` and non-root-relative
     checks.
2. **`app/(dashboard)/dashboard/editor/[id]/page.tsx`** — the login redirect
   now `encodeURIComponent`s the `id` path param, so a crafted path cannot put
   control characters into the `?next=` query (defence in depth).
3. **`tests/redirect.test.ts`** — 10 new cases (49 total in the file):
   literal tab/LF/CR, other C0 controls and DEL, encoded separators/controls,
   leading-whitespace protocol-relative, encoded traversal, double-encoding,
   query-string exemption, and a layered test showing the login page re-checks
   an encoded payload from `?next=`.

**Verification.**

```
npm run typecheck   pass
npm run lint        pass
npm run test        342 passed (25 files; 49 redirect tests)
npm run build       pass
```

No database change — application-code fix; ships with the next deploy. All
other `new URL(...)` sinks were audited: they use trusted input (env origins,
server URLs, hostname parsing), not user redirects.

**Post-deploy check:** `curl -sSI "https://shipsprint.site/auth/callback?next=%2F%09%2Fevil.com"`
must not emit a `Location` pointing at `evil.com`.

---

## C5 — Custom domains are Pro-only, enforced in the database (H1)

**Severity:** HIGH · **Audit ref:** `audit/H1-custom-domain-gate.md`

**The hole.** The only custom-domain plan gate was in
`app/api/domains/route.ts`. Because the anon key is public and `sites` has an
owner INSERT/UPDATE policy, any free user could call PostgREST directly:

```bash
PATCH /rest/v1/sites?id=eq.<site-uid>  {"custom_domain":"myapp.com"}
```

and get a custom domain + automatic TLS without paying. Once the row exists,
`/api/caddy/ask` authorizes on-demand TLS for that hostname — so the same hole
also allowed Let's Encrypt rate-limit exhaustion (the PRDD's R2 attack).

**The fix.**

1. **`supabase/migrations/014_lock_custom_domain_plan.sql`** (new) —
   `guard_custom_domain()` BEFORE INSERT OR UPDATE OF `custom_domain`:
   - normalizes to lowercase/trim (blank → NULL/disconnect);
   - **plan gate** via `profiles → plans.has_custom_domain` (fails closed);
   - **platform-domain hijack protection** — rejects `shipsprint.site`,
     `*.shipsprint.site`, plus a configurable `app.root_domain`; the real
     platform domain is hard-coded so a session-level `SET app.root_domain`
     cannot bypass it;
   - **hostname validation** (≤253 chars, per-label ≤63, no leading/trailing
     hyphens) and **IP-address rejection** for direct writes;
   - `SECURITY DEFINER` + pinned `search_path`; EXECUTE revoked from clients;
   - self-verifying `DO` block + `NOTIFY pgrst`.
2. **`app/api/domains/route.ts`** — maps trigger errors to actionable
   responses: `42501` → 403 (Pro required), `23514` → 400 (domain/root/format),
   `23505` → 409 (already connected).
3. **Mirrored** into `supabase/schema.sql` and `production.sql`.
4. **CI:** `scripts/validate_schema.py` section 6d + the generic SECURITY
   DEFINER scan; `tests/domain-plan-guard.test.ts` (15 tests).

**Verification.**

```
python scripts/validate_schema.py   pass (section 6d + generic scan)
npm run typecheck                   pass
npm run lint                        pass
npm run test                        356 passed (26 files; 15 new H1 tests)
npm run build                       pass
```

Functional proof on a real PostgreSQL 16 cluster applying the actual migration
twice — **31/31 checks pass:** free user denied / Pro allowed, root + subdomain
hijack rejected (even with `SET app.root_domain`), invalid hostname/IP
rejected, uppercase normalized, disconnect allowed, INSERT rules, duplicate
domain, service-role plan rule, trigger EXECUTE lock, SECURITY DEFINER +
search_path.

**Deploy step (required):** apply
`supabase/migrations/014_lock_custom_domain_plan.sql` to the production
database, then verify with the post-apply checks at the bottom of the file.

---

## H2 — Remove fabricated metrics (homepage + every new site)

**Severity:** HIGH · **Audit ref:** `audit/H2-fabricated-metrics.md`

**The hole.** The marketing homepage hard-coded 120 published sites, a 4.9/5
rating, 120 reviews, 842 weekly installs, an 18.4% CTR and 99.9% uptime, then
clamped real values with `Math.max(DEFAULT, real)` so the fiction could never
be undercut. `getFlagshipDefaultContent()` seeded the same fake social proof
into **every new customer site** (1,200+ pages, 4.9/5, 99.9% uptime, 14,820
installs, +24.8% CTR), and the editor pre-filled 1,200+ / 4.9 / 99.9% in the
impacts fields. That is false advertising, and it made customers publish
fabricated numbers to their own users.

**The fix.**

- `lib/metrics.ts` — returns only real values (`publishedSites`, `totalClicks`
  from `get_platform_metrics()`); no defaults and no fabricated floor. Missing
  env/DB → an honest `0` state.
- `app/page.tsx` — removed the fake stars/rating/avatars/uptime/CTR/installs.
  The section is now honest product facts (free to publish, the real published
  count, custom domain, cookieless analytics, store buttons, no code).
- `lib/templates.ts` — new sites get no `rating_stars`, no fabricated `impacts`
  metrics, and no fake chart/checklist/readiness numbers.
- `components/renderer/site-renderer.tsx` — the impacts section renders
  **only** when the owner provides data; the hero rating only when
  `rating_stars` is set; proof graphics only when `proof_meta` has content (no
  index-based defaults, no hard-coded fallback numbers).
- `components/editor/editor-panel.tsx` — impacts and hero-rating inputs no
  longer prefill fake values (`1,200+`, `4.9`, `99.9%`); they start empty.
- Tests — `tests/metrics.test.ts` rewritten; new
  `tests/no-fabricated-metrics.test.tsx` (default-content assertions + a real
  `renderToStaticMarkup` of the default site + static source checks).

**Verification.**

```
npm run typecheck   pass
npm run lint        pass
npm run test        365 passed (27 files)
npm run build       pass
```

The prerendered homepage contains **0** occurrences of `4.9/5`, `1,200`,
`14,820`, `18.4`, `842`, `99.9`, "Trusted by indie makers" or "Starred by
indie makers".

---

## Starting state

`node_modules` had never been installed. There was no `.env` file, no
`supabase/config.toml`, no tests, no CI, no error boundaries, no loading
states, no rate limiting, no logging, and the `README.md` was the verbatim
`create-next-app` template.

The build had never been run, so it was unknown whether the project compiled
at all. It did — but it **failed at prerender** on `/signup` because
`createClient()` ran during render and `@supabase/ssr` throws without
credentials. Builds must not require secrets.

---

## 1. Security — the eight P0 holes

Two of these were directly monetizable: an unauthenticated request could grant
anyone a paid plan, and a placeholder API key could grant it to everyone.

### 1.1 Unauthenticated webhook forgery — CRITICAL

`app/api/billing/webhook/route.ts` made signature verification **conditional**.
With `DODO_PAYMENTS_WEBHOOK_KEY` unset it fell through to
`JSON.parse(rawBody)`, so anyone could POST a crafted event and set their own
`profiles.plan_id` to `"pro"`. Not gated on `NODE_ENV`.

**Now:** verification is mandatory; an unconfigured endpoint returns **503**
and processes nothing. There is no development bypass inside the handler.

### 1.2 Free plan escalation — CRITICAL

`app/api/billing/checkout/route.ts` fell back to writing `plan_id` directly
with the service-role client whenever `getDodoClient()` returned `null` — which
included the case where the API key was a copied placeholder. Reachable in
production.

**Now:** the branch is deleted. Simulation lives in
`app/api/dev/simulate-upgrade/route.ts`, which returns 404 in production.

### 1.3 Open redirect — HIGH

`app/(auth)/auth/callback/route.ts:13` did
`new URL(next, request.url)`. `new URL("https://evil.com", base)` returns
`https://evil.com` — the absolute URL wins. A crafted confirmation link
redirected the user to an attacker site immediately after clicking a link in a
trusted-looking email. The login page had the same sink via
`router.push(next)`.

**Now:** `lib/redirect.ts` → `safeRedirectPath()` rejects absolute,
protocol-relative, backslash-smuggled, percent-encoded, and scheme-bearing
values. Applied at both sites, plus the middleware `next` parameter.

### 1.4 Service-role key exposure — HIGH

`lib/supabase/admin.ts` had no `import "server-only"`. One stray
client-component import would have bundled the service-role key into the
browser payload.

**Now:** `server-only` added, plus an ESLint `no-restricted-imports` rule
scoped to `components/**`.

### 1.5 Stored XSS via content — HIGH

`components/renderer/site-renderer.tsx` rendered `store_links[].url` and
`legal_links[].url` into `<a href>`. `type="url"` in the editor is a hint, not
a constraint, so `javascript:alert(1)` was accepted and rendered on the public
page.

**Now:** `lib/validation.ts` rejects anything that is not `http:`/`https:` on
write, **and** `safeHref()` neutralises it at render time as defence in depth
for rows that predate the schemas.

### 1.6 SVG upload — stored XSS — HIGH

`app/api/upload/route.ts` allow-listed `image/svg+xml` into a **public** R2
bucket. SVG is an active document that can carry `<script>`; the R2 URL is
public and displayed in the editor, so opening it directly executes the script.

**Now:** SVG rejected (415) and removed from the editor's `accept` attribute.
File content is also checked against magic numbers, because `File.type` is
client-supplied.

### 1.7 Plan quota bypass via PostgREST — HIGH

`supabase` policy let any authenticated user `INSERT` into `sites` using the
anon key that ships to the browser, bypassing `site_limit` and self-publishing
without opening the editor. The quota check in `/api/sites` was advisory.

**Now:** a `BEFORE INSERT` trigger reads the owner's plan and rejects the row
past the limit. Enforced in the database because app checks are always
bypassable.

### 1.8 Subdomain takeover via reserved slugs — MEDIUM

Nothing stopped a user claiming `api`, `dashboard` or `admin`, and the wildcard
DNS points `*.root` at the app.

**Now:** a `reject_reserved_slug()` trigger with a reserved list plus a
`%shipsprint%` guard.

### Also in this phase
- Reserved `alert()` calls in `site-card.tsx` and `editor-panel.tsx`.
- Error leakage: five routes returned `error.message` verbatim, which can echo
  upstream provider responses. Now logged in full, returned generically.
- `/api/upload` base64 fallback removed — it wrote multi-megabyte `data:` URIs
  into `sites.content` jsonb.
- Site deletion now deletes associated R2 objects instead of orphaning them.
- `published_at` is now cleared on unpublish (previously only ever set).

---

## 2. Bugs found in the Dodo Payments integration

Found by reading the installed SDK's type definitions rather than assuming.

### 2.1 Every Dodo request was unauthenticated — CRITICAL

The client constructed `new DodoPayments({ apiKey, webhookSecret })`. The SDK
option is **`bearerToken`** and **`webhookKey`**. The old names were silently
ignored, so no request carried authentication.

### 2.2 `current_period_end` did not exist

The webhook read `data.current_period_end || data.expires_at`. Neither field
exists on Dodo's `Subscription`. The real field is **`next_billing_date`**, so
renewal dates could never display.

### 2.3 `dodo_customer_id` was never set

`CheckoutSessionCreateParams.customer` takes `NewCustomer`, which **has no
`metadata` field**, and the session response returns no customer id. Nothing
ever called `customers.create`. Result: the billing portal 404'd for every
subscriber and cancellation was impossible in-app.

**Now:** the customer is created explicitly with metadata, then attached, and
the id is persisted to `profiles` at checkout.

### 2.4 Response field name

`session.checkout_session_id` does not exist; it is `session_id`.

### 2.5 `payment.failed` was unhandled

The dunning path. Dodo's docs call it out explicitly. A failed renewal silently
did nothing.

### 2.6 Cancellation downgraded immediately

`subscription.cancelled` set `plan_id = "free"` regardless of
`current_period_end`, so a customer who cancelled mid-period lost features
they had already paid for.

**Now:** cancellation marks the subscription; the expiry cron performs the
downgrade once the period actually ends.

---

## 3. Billing model restructure (yearly plans)

You added yearly pricing, which the schema could not represent.

`profiles.plan_id` was doing double duty as *tier* and *billed product*. Four
SKUs on three tiers does not fit in that column — either every feature check
becomes `"pro" || "pro_yearly"`, or yearly becomes a hardcoded special case.

**Now two tables:**

| Table | Holds | Seeded |
|---|---|---|
| `plans` | the **tier** — `site_limit`, `has_custom_domain`, `has_analytics_dashboard` | `free`, `basic`, `pro` |
| `products` | the **SKU** — price, billing period, Dodo product id | `basic_monthly` 399, `basic_yearly` 3599, `pro_monthly` 999, `pro_yearly` 9799 |

`profiles.plan_id` still stores a tier, so **every existing feature check keeps
working unchanged**. Adding a price is an `INSERT`, not a redeploy.

Consequences:
- The checkout request now names a `product_id`, never a `plan_id` — a client
  cannot ask to be charged for the cheap SKU and granted the expensive tier.
- The webhook maps Dodo's `product_id` through the catalogue.
- `DODO_PRODUCT_ID_*` env vars are gone. They were a fourth copy of the
  catalogue.
- Yearly savings are computed from the two real prices (Basic 25%, Pro 18%),
  not hardcoded badges.

---

## 4. Four sources of truth for pricing → one

Prices lived in four places: `plans.price_cents` (a column nothing read),
`app/page.tsx`, `components/billing/billing-view.tsx`, and
`lib/billing/dodo.ts`. Changing a price meant editing three components.

**Now:** all of them read the `products` table. The marketing page reads it
through `unstable_cache` (5-minute revalidate), so it stays a static document
rather than becoming a per-request render.

Also fixed:
- **All three pricing CTAs pointed at a bare `/signup`**, discarding the
  choice. They now carry `?plan=`, signup preserves it through email
  confirmation, and billing auto-starts checkout.
- **`?success=true` was forgeable** — `/dashboard/billing?success=true&plan=pro`
  displayed a confirmation for a purchase that never happened. Now carries
  `?checkout=returned` and states the plan updates when the provider confirms.
- Plan buttons were `disabled` with no action. The portal now works.
- `billing/page.tsx` selected the *latest* subscription rather than the
  *entitlement-bearing* one, so the renewal date was wrong after an upgrade.

---

## 5. Custom domains — this feature did not work at all

### 5.1 The upsert could never succeed

`app/api/domains/route.ts` performed
`.upsert({...}, { onConflict: "site_id" })` against a table with **no unique
constraint** on `site_id`. Postgres rejects that with error 42P10 on every
call. The error was never checked, so the API returned `{ success: true }`.

Every customer has so far "successfully" connected a domain that was never
recorded.

### 5.2 The UI claimed verification that never happened

`editor-panel.tsx:746` displayed **"Status: Active & TLS Verified"** the instant
the user clicked Connect — before any DNS record existed. The panel also
advertised "on-demand TLS automatically issues and renews your SSL certificate
on the first visitor request" with **no ACME client anywhere in the repo**.

### 5.3 Two contradictory answers

The API stored `ownership_verification.name = cleanDomain.split(".")[0]`
(`"myapp"`) while the response said `"@ or app"`, and the editor table repeated
`cname.shipsprint.site` hardcoded. Also: an apex domain needs an `A` record,
not a `CNAME`, so the instructions were wrong for the most common case.

### 5.4 Now

- `lib/dns.ts` — real `resolveTxt` / `resolveCname` with timeouts.
- Real state machine: `pending_dns` → `pending_validation` → `active`, derived
  from actual DNS. Persisted and readable.
- A **TXT ownership record is required** (`shipverify=<site-uuid>`), so a
  customer cannot claim a domain they do not control. That is what makes
  on-demand TLS safe.
- `GET /api/domains` re-checks on every read; the editor polls until active.
- The editor renders **real state and the exact records the API checks** — no
  hardcoded table, no "TLS Verified" before it is true.
- `app/api/caddy/ask/route.ts` — the allow-list that gates certificate
  issuance. Only a domain connected to a **published** site is authorized.
  Without it, anyone who can set a DNS record could exhaust the Let's Encrypt
  quota (5 duplicate certs/week per domain, 50/week registered) and lock you
  out of issuing anything at all.

---

## 6. Analytics — untrustworthy and abusable

### 6.1 Anyone could poison anyone's numbers

`/api/track` was unauthenticated, unrated, unbounded, and verified only that
the site **existed** — not that it was published. Anyone could inflate a
competitor's metrics, or a draft's, with a loop of `curl`.

**Now:** rate limited (Redis, 60/min per hashed client key), published-only,
`meta` key-allow-listed and size-capped, bot-filtered, and every response is
204 — returning 404 for a missing site had made it a site-id oracle.

### 6.2 Traffic sources were structurally wrong

`analytics-view.tsx` grouped referrers across **all** events, but only
`page_view` carries a referrer. Every `button_click` was bucketed as "Direct",
systematically overstating direct traffic.

**Now:** `site_analytics_sources` scopes to `page_view`.

### 6.3 Other metric bugs

- Day buckets mixed local-time `Date` with `toISOString()` (UTC) — up to ±14h
  skew. Now bucketed in Postgres on `at time zone 'utc'`.
- `Math.max(8, ...)` rendered zero-traffic days as visible bars.
- Device distribution counted all events, so a visitor who clicked 3 times
  was counted 4 times.
- CTR computed over 30 days of data, displayed as 7.
- Hardcoded fake metrics in the Pro upsell (4,289 views / 24.4% CTR).

### 6.4 Aggregation moved server-side

The dashboard fetched up to 1000 raw events and aggregated them in a React
`useMemo` — silently wrong past the cap, and the whole event set was
serialized into the RSC payload.

**Now:** three Postgres views + a `telemetry_daily` rollup, plus
`rollup_telemetry()` and `prune_analytics()` driven by cron. **The UI still
needs wiring to these** — see Remaining Work.

---

## 7. Middleware → `proxy.ts`, five routing bugs fixed

Next 16 renamed the convention. Renaming also required deleting the old file —
having both is a hard error, not a warning.

| # | Bug | Effect |
|---|---|---|
| 1 | `"127.0.0.1".split(".")[0]` → `"127"` | Whole app rewrote to `/site/127`. Broke Docker, Codespaces, LAN. |
| 2 | Any non-root host treated as a custom domain | `/` returned "Page Not Found" on every preview and staging host |
| 3 | `rewrite()` omitted `{ request }` | Refreshed session cookies not forwarded downstream |
| 4 | `NEXT_PUBLIC_ROOT_DOMAIN` (client-exposed) used for server routing | Split into server-only `ROOT_DOMAIN` + `APP_HOSTS` |
| 5 | Full Supabase Auth round-trip on every request | Including every analytics beacon. Now only for `/dashboard`, `/login`, `/signup`. |

---

## 8. Configuration

| File | Change |
|---|---|
| `next.config.ts` | Was **empty**. Added `poweredByHeader: false`, `output: "standalone"`, security headers (nosniff, X-Frame-Options DENY, HSTS, Referrer-Policy, Permissions-Policy, COOP), `serverExternalPackages`, `images.remotePatterns`. |
| `tsconfig.json` | `target` ES2017 → ES2022. Added `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. Dropped `allowJs`. |
| `eslint.config.mjs` | Had **zero rules**. Added `no-explicit-any`, `no-unused-vars`, `no-console`, `eqeqeq`, `no-var`, and `no-restricted-imports` for credential-holding modules. |
| `app/globals.css` | Removed `font-family: Arial` which **overrode the Geist font** — it was downloaded at build time and never rendered. Added the `scrollbar-thin`/`scrollbar-none` utilities used in 4 places but defined nowhere. `scroll-margin-top` for anchors under the sticky header. `prefers-reduced-motion`, `:focus-visible`, `::selection`. |
| `tw-animate-css` | Installed. `animate-in`/`fade-in` were used in 13 places with the plugin absent — every modal and section transition was a silent no-op. |
| `.gitignore` | `.env*` had no `!.env.example` negation, so the example file would have been silently ignored. |
| `package.json` | Added `typecheck`, `test`, `test:coverage`, `check`, `db:*` scripts, `engines`. Removed unused `openai` and `@aws-sdk/s3-request-presigner`. Fixed `brace-expansion` high-severity advisory. |

`noUncheckedIndexedAccess` immediately caught real bugs in `middleware.ts` and
`lib/redirect.ts` that had been latent.

---

## 9. Environment handling — the root-cause fix

The old design decided "is this a real environment?" by **substring-matching
the env value**: `apiKey.includes("your-dodo")`, `accountId.includes("placeholder")`.
Production behaviour depended on the wording of an undocumented secret. That
single mechanism is what stood between a placeholder key and the
plan-escalation path in 1.2.

**Now** `lib/env.ts`: a Zod schema, parsed **lazily** and cached. Lazy because
Next evaluates module scope during prerendering, so import-time validation
would make `next build` require production secrets. A missing variable now
fails at the exact call site with a message naming it.

Also unified three inconsistent failure modes: `admin.ts` threw, `dodo.ts` and
`r2.ts` returned `null`, and `supabase/middleware.ts` silently degraded to
anonymous — which quietly disabled the `/dashboard` guard on a broken env.
Production failures now always throw; development features report why they are
disabled.

---

## 10. Dead code and duplication removed

- 14 unused imports across 8 files.
- 27 `any` types — all `catch (err: any)` and `Record<string, any>`.
- `lib/utils.ts` — both exports had zero importers. Its `formatPrice` is now
  `lib/plans.ts` and actually used.
- `openai@^6.49.0` and `@aws-sdk/s3-request-presigner` — installed, never
  imported.
- 5 default `public/*.svg` from create-next-app, referenced by nothing.
- `types/database.ts` `DomainVerification` — zero importers.
- Two divergent copies of slug sanitization (`api/sites/route.ts` and
  `create-site-dialog.tsx`) replaced by one Zod schema.
- `AVAILABLE_ICONS` and `iconMap` were two hand-synced lists; an icon added to
  one silently fell back to `Sparkles` in the other.
- `feat-${Date.now()}` ids collide on rapid double-add. Now
  `Date.now().toString(36)` + random suffix.

---

## 11. Correctness fixes found along the way

- `site/[slug]/page.tsx` returned **HTTP 200** with "Page Not Published Yet" for
  non-owners — a soft 404 that crawlers index. Now `notFound()`.
- The owner's own draft preview **fired real analytics**, inflating the
  numbers on the billing page.
- `normalizedHostname` accepted `bad-.com`: the hyphen check was
  per-hostname, not per-DNS-label. **Caught by a test I wrote.**
- `published_at` never cleared on unpublish.
- Slug uniqueness was TOCTOU — a racing request got 500 instead of 409.
- Seeded defaults were fake: store links pointed at `https://apps.apple.com`
  and `https://play.google.com`, so a site published without editing rendered
  a working "Download on the App Store" button linking to Apple's homepage.
  `legal_links` were `"#"`, `contact_email` was `support@example.com`.
- `deleteFromR2` uses UUID keys, not `Date.now()` (collision-prone and
  predictable).
- `checkoutIntents`/`webhookEvents`/`auditLog` — new tables, so "who changed
  this plan?" and "did the upgrade webhook arrive?" are now answerable.

---

## 12. Infrastructure added

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage, `output: standalone`, non-root, healthcheck |
| `docker-compose.yml` | caddy + app + redis, separated networks, `:?` guards on every secret |
| `infra/Caddyfile` | Wildcard cert for `*.root`; on-demand TLS for customer domains via `/api/caddy/ask`; ships on the **staging** CA deliberately |
| `.dockerignore` | |
| `app/api/health/route.ts` | Reports which vars are set (never their values) and pings the DB. 503 until genuinely healthy |
| `app/api/cron/maintenance/route.ts` | Rollup, prune, intent cleanup. `CRON_SECRET`-guarded |
| `.github/workflows/ci.yml` | typecheck, lint `--max-warnings=0`, tests, build, `npm audit --audit-level=high`, and a **migration-integrity job** that applies the schema twice and asserts the triggers actually fire |

---

## 13. Tests — 57, all passing

`npm run test`

| File | Covers |
|---|---|
| `tests/redirect.test.ts` | Open redirect: `//evil.com`, `/\evil.com`, `%2F%2F`, `javascript:`, `data:`, `file:`, `vbscript:`. Plus hostname label validation |
| `tests/validation.test.ts` | XSS payloads through every URL field; unknown-key rejection; array bounds; slug format; SKU allow-list |
| `tests/proxy-host-routing.test.ts` | `127.0.0.1`, `*.localhost:3000`, preview hosts, custom domains |
| `tests/billing-state-machine.test.ts` | Plan from `product_id` without metadata; no downgrade on cancel; no downgrade during dunning; expiry reconciliation |

`tests/validation.test.ts` caught a real bug: `normalizeHostname("bad-.com")`
returned a value instead of `null`.

---

## 14. Database

| File | Change |
|---|---|
| `supabase/schema.sql` | **Convergent** consolidated schema. 844 lines. Every table gets `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` per column, a data-migration step before the constraints, then 12 RLS policies, triggers, and the analytics views |
| `supabase/config.toml` | Local Supabase config |
| `supabase/migrations/002_hardening.sql` | Unique constraint, 7 indexes, CHECK constraints, `set_updated_at`, site-limit and reserved-slug triggers, `search_path` pinning, 3 billing tables |
| `supabase/migrations/003_analytics_and_templates.sql` | Aggregation views, rollup/prune functions, `templates` table |
| `scripts/validate_schema.py` | Parses the SQL with `pglast` and asserts convergence. **Found 4 real gaps in my own rewrite** |
| `scripts/db-sync.mjs` | Reports drift, applies pending migrations, generates types. Never prints a secret |

The `supabase/schema.sql` convergence fix was a real bug of mine: the first
version used bare `CREATE TABLE IF NOT EXISTS` and died with
`ERROR: 42703: column "tagline" of relation "plans" does not exist` because
your `plans` table already existed without that column, so the CREATE was
skipped and the following INSERT referenced a column nobody had added.

CI now applies the schema **twice** and asserts the reserved-slug and
site-limit triggers fire, because idempotency is a property you have to test.

---

## 15. Documentation

- `README.md` — **still the create-next-app template. Not yet rewritten.**
- `PRODUCTION_PLAN.md` — 10 phases, acceptance criteria
- `docs/DEPLOY.md` — webhook URL, event list, DNS, env, deploy, go-live
  checklist
- `docs/DNS-SETUP.md` — Hostinger hPanel walkthrough
- `.env.example` — all 15 vars documented

---

## 16. Deliberately not changed

- **`components/renderer/site-renderer.tsx` is still a client component.** The
  entire public SEO surface ships as a client bundle and renders nothing until
  hydration. For a product whose output must rank, this is the wrong trade, but
  converting it is Phase 6 and touches the analytics beacon.
- **Six raw `<img>` tags** still carry `@next/next/no-img-element`
  suppressions. `next/image` is configured but not adopted.
- **The analytics UI** still aggregates in the browser. The SQL views exist
  and are unused.
- **Templates** — table exists, no gallery, no picker.
- **Generated Supabase types** — `types/database.ts` is still hand-written and
  queries are still `as`-cast. This is why the `onConflict` bug shipped
  unnoticed. Requires a live connection to generate.
- **No password reset flow.** `login/page.tsx` has an empty flex row where it
  was planned.
- **No legal pages**, and the footer links are still `#`.
- **`supabase/.temp/`** is untracked and not in `.gitignore` — add
  `supabase/.temp/` and `supabase/.branches/` before committing.
