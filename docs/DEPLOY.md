# Deploying ShipSprint to shipsprint.site

Everything below assumes a single AWS EC2 instance running Docker Compose,
with Caddy as the TLS-terminating edge.

---

## 1. The Dodo Payments webhook URL

Register this exact URL in the Dodo dashboard:

```
https://shipsprint.site/api/billing/webhook
```

**Two steps, both required.**

1. **Dashboard -> Webhooks -> Add endpoint**
   - URL: `https://shipsprint.site/api/billing/webhook`
   - Description: `ShipSprint production`
   - Toggle **Disabled** off.

2. **Copy the webhook secret** it generates and put it in your `.env` as
   `DODO_PAYMENTS_WEBHOOK_KEY`.

   This is not optional. If it is missing, the endpoint returns **503 and
   refuses to process anything**. That is deliberate: the previous
   implementation fell back to `JSON.parse` when the key was absent, which
   meant anyone could POST a crafted event and grant themselves a paid plan.

### Events to subscribe

Enable these. The handler has explicit behaviour for each; anything else is
recorded in `webhook_events` and acknowledged, so you can add types later
without a deploy.

| Event | Effect |
|---|---|
| `subscription.active` | Grants the plan, creates the subscription row |
| `subscription.renewed` | Re-grants and extends `current_period_end` |
| `subscription.updated` | Syncs status |
| `subscription.unpaused` | Restores access after dunning recovers |
| `payment.succeeded` | Grants the plan for the first payment |
| `payment.failed` | Marks `past_due`, **keeps** the plan |
| `subscription.past_due` | Marks `past_due`, keeps the plan |
| `subscription.on_hold` | Marks `past_due`, keeps the plan |
| `dunning.started` | Records the dunning attempt |
| `subscription.cancelled` | Marks cancelled, **does not downgrade yet** |
| `subscription.expired` | Downgrades to free |
| `subscription.plan_changed` | Moves between tiers |
| `refund.succeeded`, `dispute.*` | Recorded for your records |

### Test it

```bash
# 1. Buy something in Dodo test mode, then:
curl -s https://shipsprint.site/api/health | jq

# 2. Did the event arrive and get handled?
#    Supabase -> SQL Editor:
select event_type, processed, note, received_at
from public.webhook_events
order by received_at desc
limit 20;

# 3. Was the tier granted?
select id, plan_id, dodo_customer_id from public.profiles;
select user_id, plan_id, product_id, status, current_period_end
from public.subscriptions;
```

A `processed = true` row with a `note` is the only proof that an upgrade
actually happened. Trust that, not the browser.

---

## 2. Apply the database schema

Supabase Dashboard -> **SQL Editor** -> New query -> paste
`supabase/schema.sql` -> Run.

It is idempotent, so it is safe to run on an empty project and safe to re-run.
It ends with a verification query. You should see:

| Object | Expected |
|---|---|
| plans | 3 |
| products | 4 |
| templates | 0 (seeded later) |
| site_analytics% views | 3 |

Then scroll to **section 14** and uncomment the four `UPDATE` statements with
your real Dodo product ids. Prices are already set to your live figures:

| id | price_cents | displays as |
|---|---|---|
| `basic_monthly` | 399 | $3.99/mo |
| `basic_yearly` | 3599 | $35.99/yr |
| `pro_monthly` | 999 | $9.99/mo |
| `pro_yearly` | 9799 | $97.99/yr |

**Do not go live until all four rows show a `dodo_product_id`.** A product with
a null id returns *"That plan is not available right now"* at checkout rather
than charging a wrong amount — deliberate, but it blocks purchases.

### Plan and product are separate tables

This is the part worth understanding, because it is why yearly plans work at
all:

- **`plans`** = the tier (`free` / `basic` / `pro`). Carries `site_limit`,
  `has_custom_domain`, `has_analytics_dashboard`. This is what
  `profiles.plan_id` stores, so every feature check reads one value.
- **`products`** = the SKU (`pro_yearly` etc). Carries the price, the billing
  period, and the Dodo product id.

Four SKUs map onto three tiers. Adding a price or a new period is an `INSERT`,
not a code change. The alternative — folding the period into the plan id —
would force every feature check to become a string comparison against four
values.

---

## 3. DNS records

`shipsprint.site` is registered at Hostinger, so the hPanel walkthrough is in
**[docs/DNS-SETUP.md](DNS-SETUP.md)** — including the two-record conflict that
produces a certificate error nobody can diagnose from the browser.

Short version, three `A` records, all to your server IP:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `<server-ip>` |
| `A` | `*` | `<server-ip>` |
| `A` | `cname` | `<server-ip>` |

Verify before anything else:

```bash
dig +short test.shipsprint.site    # must resolve; if not, the wildcard is wrong
```

---

## 4. Supabase auth redirect URLs

Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs:

```
https://shipsprint.site/auth/callback
https://www.shipsprint.site/auth/callback
http://localhost:3000/auth/callback
http://*.localhost:3000/auth/callback
```

If you use a staging deployment, add its host too. **Without this, clicking a
confirmation email fails** — which is a much worse first impression than a
missing avatar.

Also disable email confirmation during early testing
(Authentication -> Providers -> Email -> Confirm email = off) or every signup
requires an inbox you may not be watching.

---

## 5. Environment

Copy `.env.example` to `.env` on the server and fill it in. The values that
are **not** public:

```
SUPABASE_SERVICE_ROLE_KEY=        # Settings -> API -> service_role
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=
DODO_PAYMENTS_ENVIRONMENT=live_mode
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
CRON_SECRET=                      # openssl rand -hex 32
ACME_CONTACT_EMAIL=you@yourdomain.com
CF_API_TOKEN=                     # Cloudflare, for DNS-01 on the wildcard
```

`next build` deliberately does **not** require any of these. `lib/env.ts`
validates lazily, so a build succeeds without secrets and a missing variable
fails at the point of use with a message naming it. That is what makes CI
work.

---

## 6. Start it

```bash
docker compose up -d --build
docker compose logs -f app
curl -s localhost:3000/api/health | jq
```

`/api/health` returns 503 until every required variable is present **and** the
database is reachable. It never prints a secret, only whether each is set.

### First run only: the wildcard certificate

Caddy needs a DNS-01 token to issue `*.shipsprint.site`. Get one from
Cloudflare -> My Profile -> API Tokens -> Create Token -> Edit zone DNS.

```bash
# Caddy starts on the staging CA by default so a misconfiguration cannot burn
# Let's Encrypt rate limits. Check the log for a successful issuance, then
# remove the `acme_ca` line from infra/Caddyfile and restart.
docker compose logs caddy | grep -i certificate
```

Watch two renewal cycles before you trust it. A certificate that fails to
renew silently takes the whole site down when it expires, and the
`ACME_CONTACT_EMAIL` is what makes that failure visible.

---

## 7. Custom domains (Pro customers)

A customer connects their domain in the editor and gets these two DNS
records, generated per-site from `CNAME_TARGET_HOST`:

| Type | Name | Value |
|---|---|---|
| `TXT` | `_shipverify.<their-domain>` | `shipverify=<site-uuid>` |
| `CNAME` or `A` | `@` | `cname.shipsprint.site` |

- An **apex** domain (`myapp.com`) needs an `A` record, not a `CNAME`. The UI
  detects this and says so.
- The `TXT` record is what proves they own the domain. Without it the status
  stays `Pending DNS` — this is why Caddy's on-demand TLS cannot be pointed at
  a domain you do not control.
- Status goes `Pending DNS` -> `Pending validation` -> `Active`. The editor
  polls and displays the real state.

Caddy asks `/api/caddy/ask` before requesting a certificate, and that endpoint
only authorizes a domain that a customer has actually connected to a
**published** site. That allow-list is not optional: without it, anyone who
can set a DNS record could exhaust your Let's Encrypt quota (5 duplicate
certs/week per domain, 50/week registered) and lock you out of issuing
anything at all.

---

## 8. Cron jobs

```bash
# Downgrade cancelled subscriptions whose paid period has ended.
# Dodo retries on a non-2xx response, so a missed terminal event would
# otherwise leave a customer on Pro forever.
0 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  https://shipsprint.site/api/billing/webhook

# Roll up analytics into the daily table and prune raw events.
*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://shipsprint.site/api/cron/maintenance
```

---

## Go-live checklist

- [ ] `supabase/schema.sql` applied; verification query returns 3 plans / 4 products / 3 views
- [ ] All four `dodo_product_id` values set
- [ ] `DODO_PAYMENTS_ENVIRONMENT=live_mode`
- [ ] Webhook registered at `https://shipsprint.site/api/billing/webhook`, secret saved
- [ ] A real `test_mode` purchase produces a `processed = true` row in `webhook_events`
- [ ] DNS: `@`, `*`, and `cname` A records resolve
- [ ] Wildcard cert issued and auto-renewing
- [ ] `curl /api/health` returns `"status":"healthy"`
- [ ] A free user can publish to `their-slug.shipsprint.site` over HTTPS
- [ ] A Pro user can connect a real custom domain and reach `Active`
- [ ] Auth redirect URLs configured
- [ ] Backup verified: `pg_dump` restores into a scratch project
- [ ] ToS and Privacy pages live and linked
