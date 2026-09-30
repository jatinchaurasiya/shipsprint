# ShipSprint — Product Requirements Document

**Version** 1.0 · **Status** Pre-launch · **Last updated** against commit `abce4b4` + audit remediation

---

## 1. Executive summary

ShipSprint is a hosted landing-page builder for **individually shipping app
developers**. A developer with a working app and no design skill, no budget, and
no patience writes a URL in a browser and has a live, HTTPS-served, mobile-first
launch page in under five minutes — with a subdomain, store buttons, screenshot
carousel, and privacy-respecting analytics already wired.

It is a **hosting product first and a page builder second**. The editor exists
to remove the reason someone would not publish: it is not worth the effort. The
value is that the page is *already live at a real URL* the moment they are done,
on a real subdomain, with a real certificate.

### The one-line pitch

> Every indie app deserves a launch page. ShipSprint removes the three things
> that stop people shipping one: design skill, hosting setup, and time.

### Why it is not just a page builder

Page builders (Carrd, Framer, Typedream, Unbounce) generate a page and leave
you to deploy it. That final step — DNS, certificates, a web server, a CDN — is
where indie developers give up. ShipSprint collapses build and hosting into one
product, which is why the free tier can be genuinely useful rather than a
14-day trial: the subdomain *is* the product.

---

## 2. Problem

### 2.1 The observed problem

An indie developer has finished building. They have an App Store link, a Play
Store link, three screenshots, and a one-sentence pitch. They need a page.

What actually happens:

| Step | Tool they reach for | Why it fails them |
|---|---|---|
| Design | Canva, Figma | Hours of work; produces a 1600px-wide image, not a page |
| Build | Webflow, Squarespace | Monthly fee, learning curve, annual commitment |
| Publish | GitHub Pages, Netlify, Vercel | Git, config files, build errors at 1am |
| Custom domain | Cloudflare dashboard | Nameservers, DNS records, waiting for propagation |
| Certificate | Let's Encrypt + certbot | Cron jobs that silently expire |
| Analytics | Plausible, GA | Yet another account, another cookie banner, another vendor |

Six tools, six accounts, six failure points. The result: **the app launches
without a page**, or with a page that says "coming soon" for three months.

### 2.2 Why existing tools do not solve it

- **Carrd** — one page, no hosting, no store integration. Good, not complete.
- **Framer / Webflow** — built for agencies and marketing teams. Priced and
  scoped accordingly. A $29/month commitment to publish one page.
- **Typedream / Bento** — link-in-bio, not product launch pages. No screenshot
  carousel, no store buttons, no SEO surface.
- **Launchrock / Prelaunchers** — hosted, but templated. No customization.
- **quicklaunch.tech** — the closest competitor. Hosted, fast, AI-generated.
  Customization is shallow: the differentiation has to come from depth of
  control, not from a template picker.
- **"Just use GitHub Pages"** — the developer's existing answer, and the reason
  so many launch pages are a bare README.

### 2.3 Who has this problem

Indie developers, app developers, and technical founders shipping a first
public product. Typically:

- 1–3 people, often solo
- Technical, not design-trained
- Price-sensitive: a $9 tool needs to be obviously worth it
- Impatient: the page exists to support a launch announcement, not a brand
- Willing to pay *after* it works, not before

This is a large, reachable, and currently underserved audience with a specific,
time-boxed need. They are not shopping for a website; they are shipping an app
and need a page to point at.

---

## 3. Goals and non-goals

### 3.1 Goals

| # | Goal | Metric |
|---|---|---|
| G1 | Publish time under 5 minutes, zero technical knowledge | Median signup → published |
| G2 | Free tier is genuinely useful, not a trial | % of free users who publish |
| G3 | A published page that ranks and converts | Lighthouse ≥ 95, LCP < 1.5s |
| G4 | Revenue from makers who outgrow one page | MRR, conversion rate |
| G5 | Zero downtime and no lost work | Uptime, error rate, autosave |

### 3.2 Non-goals — explicitly out of scope

- **Not a general website builder.** One page type: an app launch page. No blog,
  no multi-page nav, no CMS.
- **Not a store.** The platform is the product.
- **Not a design tool.** Templates plus a constrained editor. If a user needs
  arbitrary layout, ShipSprint is the wrong product and that is acceptable.
- **Not an app-hosting platform.** We host landing pages, not applications.
- **No native mobile apps.** The editor is web-only, permanently.

Refusing these is what makes a solo operator viable. Every one of them is an
unbounded surface.

---

## 4. Personas

### 4.1 Maya — the shipper *(primary, ~70% of signups)*

Solo iOS developer, first app, launching in two weeks. Not technical in the
design sense. Has a screenshot tool's output, an App Store link, and a
one-line pitch.

**Goal:** a page that looks credible by Friday.
**Currently:** has a Notion page and a Twitter bio link.
**Willing to pay:** up to $10/month, once it looks good.
**Success moment:** shares the link on Product Hunt and it does not look amateur.

### 4.2 Dev — the prolific builder *(~20%)*

Technical, has shipped 6 apps, maintains open source. Uses ShipSprint because
they understand the model and want a subdomain per app.

**Goal:** three pages, one per app, no thinking.
**Currently:** a hand-rolled Astro site they rewrite every time.
**Willing to pay:** Basic or Pro for the volume.
**Success moment:** adds an app in 90 seconds without reading the docs.

### 4.3 Priya — the marketer *(~10%)*

Launched an app, has a small audience, wants to A/B test copy and see which
headline converts.

**Goal:** know whether anyone is clicking.
**Currently:** guessing from App Store downloads.
**Willing to pay:** Pro, specifically for analytics.
**Success moment:** sees that a feature-list headline beats a demo headline.

### 4.4 Anti-persona: agencies

Marketing teams wanting 30 client microsites with bespoke layouts. This
customer requires sales, onboarding, and a CMS. We decline. They are the reason
Webflow exists and the reason we will not.

---

## 5. Positioning

### 5.1 The wedge

Everyone optimises the editor. The undifferentiated layer is the editor; the
differentiated layer is **hosting, TLS, and subdomains working correctly with
zero configuration**.

ShipSprint's edge is: *the page is already live at a real HTTPS URL before you
have written a word, and it stays live for free forever.*

### 5.2 Differentiation

| Dimension | quicklaunch.tech | Carrd | ShipSprint |
|---|---|---|---|
| Hosting included | Yes | No | Yes |
| Custom domain | Paid | Manual | **Automatic, incl. TLS** |
| Customization depth | Low (template picker) | Medium (blocks) | **High (field-level)** |
| Templates | Yes | Manual | Yes, first-class |
| Store integration | Partial | No | Native (App Store + Play) |
| Analytics | — | — | Cookieless, built in |
| Free tier | Trial-ish | Generous | **Permanent, 1 published page** |
| Ongoing cost | Paid | Paid | **Free forever at 1 page** |

The moat is not the editor. It is operational: certificates, wildcard
subdomains, and a coherent content model that templates and custom domains both
plug into. That is why the architecture puts a shared renderer at the centre —
the same component renders the live page, the editor preview, and every
template, so they cannot drift.

### 5.3 Positioning statement

> For indie app developers who need a launch page *today* and do not want to
> become a web developer, ShipSprint is a hosted landing-page builder that
> publishes to a live HTTPS URL in minutes — unlike page builders that hand you
> a file and leave the hard part to you.

---

## 6. Product scope

### 6.1 Feature inventory

| # | Feature | Free | Basic | Pro | Status |
|---|---|---|---|---|---|
| F1 | Landing page editor | ✅ | ✅ | ✅ | Built |
| F2 | Hosted subdomain `slug.shipsprint.site` | ✅ | ✅ | ✅ | Built |
| F3 | Publish / unpublish | ✅ | ✅ | ✅ | Built |
| F4 | Owner draft preview | ✅ | ✅ | ✅ | Built |
| F5 | Screenshot upload (R2) | ✅ | ✅ | ✅ | Built |
| F6 | Page count | 1 | 3 | 10 | Built |
| F7 | Remove ShipSprint branding | ❌ | ✅ | ✅ | Built |
| F8 | Custom domain + auto TLS | ❌ | ❌ | ✅ | Built |
| F9 | Analytics dashboard | ❌ | ❌ | ✅ | Built (UI) |
| F10 | Email capture | ❌ | ✅ | ✅ | **Not built** |
| F11 | Templates gallery | ✅ | ✅ | ✅ | **Not built** |
| F12 | A/B testing | ❌ | ❌ | 🔵 | Not started |
| F13 | Custom colour themes | ❌ | ❌ | 🔵 | Not started — *remove from pricing page* |
| F14 | SEO controls (OG image, schema) | ✅ | ✅ | ✅ | Partial |
| F15 | Sitemap / robots per site | ✅ | ✅ | ✅ | **Not built** |

F11 and F10 are the two that matter most and are both missing. See §13.

### 6.2 Editor capabilities

The editor is deliberately **structured fields, not free layout**. This is a
product decision, not a limitation: it is what makes the "zero-drift" guarantee
possible and what makes templates safe.

| Section | Fields |
|---|---|
| Hero | App name, badge, headline, description, logo, App Store URL, Play Store URL |
| Features | Up to 24 items: icon, title, description, reorderable |
| Screenshots | Up to 20 images, 9:16 carousel |
| Footer | Brand name, contact email, legal links |
| Domain | Custom domain connect/disconnect (Pro) |

**Why structured rather than free-form:** a free-form editor cannot guarantee
that a template looks the same as a hand-built page, cannot be validated
server-side, and cannot be rendered identically in the editor preview. The
constraint *is* the product.

---

## 7. Core user journeys

### 7.1 Publish a page (the critical path)

```
Landing page → "Get Started with Pro"  (carries ?plan=pro_yearly)
  → Signup  → email confirmation preserves the plan
  → Billing  → auto-starts Dodo checkout
  → Return   → "Payment received. Your plan updates when the provider confirms."
  → Webhook  → profiles.plan_id updated
  → Dashboard → Create site (name, slug)
  → Editor  → fill sections, upload screenshots
  → Publish Live
  → slug.shipsprint.site, HTTPS, live
```

**Target: 5 minutes from landing page to live URL.** Every step must be
skippable or pre-filled. No step may require a DNS configuration, a build, or a
credit card for the free path.

**Free path is the same, minus checkout.** Signup → create → publish. No
upgrade prompt may block it.

### 7.2 Connect a custom domain (Pro)

```
Editor → Domain tab → enter myapp.com
  → API validates, checks plan, checks global uniqueness
  → Returns TWO DNS records generated per-site:
       TXT    _shipverify.myapp.com  = shipverify=<site-uuid>
       CNAME  @                     = cname.shipsprint.site
       (or A for an apex domain)
  → Editor polls every 15s, shows real status
  → pending_dns → pending_validation → active
  → Caddy requests a certificate on first request, authorised by /api/caddy/ask
  → https://myapp.com live
```

**Critical design constraint:** the TXT ownership record is mandatory. It is
what proves the customer controls the domain, and it is what makes on-demand
TLS safe. Without an allow-list, anyone who can set a DNS record can exhaust the
certificate authority's rate limits and deny the service TLS to everyone.

**The UI must never claim verification it has not performed.** Status is derived
from an actual DNS lookup. No "TLS Verified" until a certificate exists.

### 7.3 Understand your traffic (Pro)

```
Analytics → select site → 7/30/90-day range
  → views, clicks, CTR, unique days
  → daily bar chart
  → traffic sources (page_view scoped)
  → device split
  → store button performance
```

Cookieless. No IP stored, no fingerprint, no cross-site tracking. The client IP
is salted and truncated to 128 bits with a daily-rotating salt, used only to
rate-limit, never persisted.

---

## 8. Data model

Authoritative source: `supabase/schema.sql`.

```
auth.users ──1:1──> profiles ──1:N──> sites ──1:N──> analytics_events
                      │                 │
                   plan_id          template_id
                      │                 │
                      ▼                 ▼
                    plans ◄──N:1── subscriptions
                      │                 │
                      │            product_id
                      │                 ▼
                      └──N:1──────── products
                                 (dodo_product_id)

sites ──1:1──> domain_verifications
sites ──1:N──> telemetry_daily
profiles ──1:N──> checkout_intents
```

### 8.1 The plan/product split — the central design decision

```
plans     = the TIER     free | basic | pro
products  = the SKU      basic_monthly, basic_yearly, pro_monthly, pro_yearly
```

`profiles.plan_id` stores a **tier**, so every feature check reads one value and
never needs to know about billing periods. `products` holds price, period, and
the payment provider's product id.

**Why this matters:** the original schema had one table, which meant the plan id
doubled as the billed product. Adding a yearly plan would have forced every
feature check to become `"pro" || "pro_yearly"`. With the split, adding a price
is an `INSERT`.

### 8.2 Entitlements are enforced in the database

| Rule | Mechanism | Why not in the app |
|---|---|---|
| Site count limit | `BEFORE INSERT` trigger | The anon key ships to the browser; a client can bypass any app check by calling PostgREST directly |
| Reserved slugs | `BEFORE INSERT/UPDATE` trigger | Otherwise a user claims `dashboard.shipsprint.site` |
| Content size | CHECK `pg_column_size <= 262144` | A direct PostgREST write bypasses the API |
| Slug format | CHECK regex | The slug becomes a DNS hostname |
| Status vocabulary | CHECK constraints | Free text means a typo permanently bricks a site |

Application-level enforcement is advisory. Everything that grants a capability
lives in the schema.

### 8.3 Privacy posture

- No IP address is ever stored. `x-forwarded-for` is read, salted, truncated,
  and used only as a rate-limit bucket key.
- No cookies on published pages. Analytics is cookieless and aggregate.
- No third-party analytics, no pixels, no fingerprinting.
- `referrer` and `screen` are stored for aggregate reporting only.
- GDPR/CCPA: published pages involve no personal data. Dashboard data is the
  customer's own. Account deletion and data export are **not yet implemented**.

---

## 9. Technical architecture

### 9.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router, `output: standalone` | Server Components for the public surface, one deployable artefact |
| Edge | Caddy 2.10 | Automatic TLS incl. wildcard, and on-demand TLS for custom domains at zero cost |
| Database | Supabase (managed Postgres) | RLS, auth, and a REST API. Not self-hosted: the ops burden is disproportionate |
| Object storage | Cloudflare R2 | S3-compatible, **zero egress fees** — critical when serving customer images |
| Payments | Dodo Payments | Merchant of record: tax/VAT and chargebacks are their problem |
| Rate limiting | Redis | Shared across replicas |
| Hosting | AWS EC2 + Docker Compose | Three containers. Cheapest reliable option at this scale |

### 9.2 Request routing

```
Internet
   │
   ├─ shipsprint.site, www  ──────────────┐  (www 301s to apex)
   ├─ *.shipsprint.site  ────────────────┤  ONE wildcard cert
   └─ <customer domain>  ────────────────┤  on-demand TLS
                                          ▼
                                      Caddy :443
                                          │
                        ┌─────────────────┴──────────────────┐
                        │  on_demand_tls → /api/caddy/ask    │
                        │  (allow-list: published site only)  │
                        ▼                                    ▼
                              /api/track  ──────►  Next.js standalone :3000
                              (rewritten, no          │
                              session refresh)        ├── Supabase
                                                    ├── R2
                                                    └── Dodo
```

**Key properties:**

- **One wildcard certificate covers every free subdomain.** A single DNS record,
  one cert, unlimited users. Cost per free user is effectively zero.
- **`/api/track` is excluded from the session-refresh path.** It is the
  highest-volume endpoint; a Supabase Auth round-trip per beacon was the single
  largest latency problem in the original.
- **The auth guard is a hard allow-list.** Without it, a staging or preview host
  is classified as a customer custom domain and the app renders "Page Not Found".

### 9.3 Content rendering

One component, `SiteRenderer`, renders the live page, the editor preview, and
every template. This is the **zero-drift guarantee**: what the customer sees in
the editor is what visitors get, structurally impossible to diverge.

The consequence is that content is a **validated document**, not a layout tree.
Zod validates the entire `SiteContent` shape on write; the renderer applies
defaults for every field so a `{}` row still renders.

### 9.4 Payments flow

```
User picks SKU → POST /api/billing/checkout { product_id }
                 ├─ load products from DB (never from env)
                 ├─ reject if not a tier upgrade
                 ├─ customers.create()  → dodo_customer_id persisted
                 ├─ checkoutSessions.create() with metadata
                 └─ insert checkout_intents (user, product, session)

  ... customer pays at Dodo ...

Dodo → POST /api/billing/webhook
       ├─ MANDATORY signature verification (503 if unconfigured)
       ├─ every delivery recorded in webhook_events
       ├─ resolve user:  checkout_intents → metadata → customer metadata
       ├─ resolve tier:  products.dodo_product_id (authoritative) → metadata
       ├─ upsert subscriptions (period from next_billing_date)
       └─ update profiles.plan_id
```

**The checkout intent row is the load-bearing part.** Metadata propagation from
a checkout session to a subscription payload is not guaranteed by the provider.
Relying on it is why the original implementation left paying customers on Free.
The intent row removes the dependency entirely.

### 9.5 Non-functional requirements

| Requirement | Target | Enforcement |
|---|---|---|
| Availability | 99.9% | `/api/health` + uptime monitor |
| Public page LCP | < 1.5 s | Server Component renderer, ISR, CDN |
| Time to first byte | < 300 ms | Edge cache, `unstable_cache` tags |
| Upload limit | 8 MB, rate limited 20/hr | Magic-byte sniffing, raster only |
| Content size | 256 KB | Zod + DB CHECK |
| Analytics ingest | 60 events/min/client | Redis sliding window |
| Domain connects | 5/hr/user | Protects ACME rate limits |
| Accessibility | WCAG 2.1 AA target | Editor has ~15 known defects (U3) |
| Data retention | 90 days raw, rollup durable | `prune_analytics()` |
| Browser support | Last 2 versions, evergreen | Autoprefixer via Lightning CSS |

---

## 10. Monetization

### 10.1 Pricing

| Plan | Monthly | Yearly | Saving | Sites | Branding | Custom domain | Analytics | Email capture |
|---|---|---|---|---|---|---|---|---|
| **Free** | $0 | — | — | 1 | watermark | ❌ | ❌ | ❌ |
| **Basic** | $3.99 | $35.99 | 25% | 3 | removed | ✅ | ❌ | ✅ |
| **Pro** | $9.99 | $97.99 | 18% | 10 | removed | ✅ | ✅ | ✅ |

**Why yearly saves less than the arithmetic maximum.** Basic yearly at $35.99
against $47.88 of monthly billing is 24.8%. Pro yearly at $97.99 against
$119.88 is 18.3%. Annual discounts under ~20% are standard because they buy
predictability, not a bargain — pushing further trains customers to wait for
sales. Both figures are **computed from the two real prices**, not hardcoded, so
they stay correct if a price changes.

**Why these prices.** The audience is price-sensitive and comparison-anchored to
"$0 forever, and it's just a landing page." $3.99 is an impulse threshold. The
yearly option exists mainly to reduce churn and card-failure exposure on a
low-ticket product.

**No credit card is required for the free tier.** A trial wall would convert
Maya, who has not published anything yet, into a lost customer — she is the
person most likely to become a Pro.

### 10.2 Unit economics

Approximate, at ~200 paying customers on a single `t3.medium`:

| Cost | Monthly |
|---|---|
| EC2 (t3.medium, 20 GB gp3) | ~$35 |
| Supabase Pro | ~$25 |
| Redis | ~$15 (or self-hosted, $0) |
| R2 storage (est. 200 × 8 MB) | < $1 |
| **Total infrastructure** | **~$76** |
| **Revenue @ 200 × $3.99** | **~$798** |
| **Gross margin** | **~90%** |
| Payment processing (~3% + $0.30 MoR) | ~$29 |

**Infrastructure is ~9% of revenue and does not scale with customers** — the
per-customer marginal cost is R2 storage and a page view. The business is
constrained by distribution, not by cost. That is the correct shape for a SaaS
and it means growth does not require capital.

**Caveat:** this excludes payment disputes, refunds, and chargebacks, which for
a low-ticket digital product run ~0.4–0.6%. Budget 1% of revenue for dunning.

### 10.3 Monetization roadmap

Not built, deliberately sequenced after the core loop is proven:

1. **Email capture on Basic/Pro** — F10. The obvious next paid feature; already
   flagged on paid plans.
2. **A/B testing** — priced add-on or Pro+. Priya persona.
3. **Team seats** — only after agencies start asking, and we decline that
   segment, so effectively never.
4. **Premium templates** — one-time purchase, only if template demand proves
   real.
5. **Annual-only annuals** — no. Annual plans exist; annual contracts are a
   different product with a different buyer.

---

## 11. Go-to-market

### 11.1 Where the first users come from

The audience is already gathered in three places. No paid acquisition needed
at launch.

| Channel | Why it works | Effort |
|---|---|---|
| **Indie Hackers** | The exact audience, self-identified, with launch posts. Comment on others' launches with genuine feedback; post your own launch. | High-touch, ongoing |
| **Product Hunt** | Launch-day spike, permanent backlink, and the exact demographic. Prepare 5 hunter-supporter outreach messages. | One launch, once |
| **r/SideProject, r/webdev, r/iOS** | Launch posts. Requires genuine value in the comments, never a bare promo. | Ongoing |
| **Hacker News** | "Show HN" if the free tier is genuinely free. High variance. | Opportunistic |
| **X / Twitter** | Build-in-public. The `*.shipsprint.site` subdomain is a permanent backlink. | Ongoing |
| **YouTube / blog** | SEO plays late, compounding. Target "app landing page", "launch page for indie app". | Long-term |

### 11.2 The referral loop, built into the product

The free subdomain is `slug.shipsprint.site`. **Every published free-tier page
is a backlink and a live advertisement.** A developer who publishes gets a
permanent, indexed, HTTPS page pointing at us. This is the growth mechanism
that the pricing structure funds.

**Deliberately not done:** no badge on free tier that must be clicked, no
"powered by" interstitial, no referral codes. Link equity is earned by the page
being genuinely good, not by a nag.

### 11.3 Launch sequence

1. **Pre-launch:** 20–30 design partners, recruited from Indie Hackers
   comments. Manually onboard. Watch where they get stuck — that is the
   onboarding funnel data you cannot get any other way.
2. **Soft launch:** Product Hunt. Free tier fully open, no payment required.
   Target: 500 signups, 200 published pages.
3. **Paid open:** enable checkout. Monitor the webhook daily for the first week.
4. **Month 2–3:** SEO content, YouTube teardowns, template launches as hooks.
5. **Ongoing:** one substantial feature per month, announced to a list.

### 11.4 Conversion path

```
Free, 1 page published
   → needs a 2nd app?            → Basic ($3.99)
   → has revenue, wants a domain? → Basic
   → wants to know if it works?   → Pro ($9.99)
   → annual, to save 25%?         → Basic yearly
```

The conversion trigger is **a second app**, not a feature wall. This is why
Free is capped at 1 page rather than 3: the second page is the moment the user
has demonstrated the product works and is now thinking about their *next* app.

---

## 12. Success metrics

### 12.1 North star

**Weekly pages published by accounts that were created in the prior 30 days.**

Not signups. Not MRR. Published pages measure the value delivered, and they
correlate directly with future conversion because a published page is a page
that will eventually need a second.

### 12.2 Metrics

| Metric | Target (month 3) | Target (month 6) |
|---|---|---|
| Signups / month | 800 | 2,500 |
| Signup → published | > 55% | > 65% |
| Median signup → published | < 10 min | < 6 min |
| Free → paid conversion | > 2% | > 3.5% |
| Paid → yearly | > 40% of new paid | > 50% |
| MRR | $1,200 | $6,000 |
| Churn, monthly | < 6% | < 4% |
| Pages live | 2,000 | 12,000 |
| Uptime | 99.9% | 99.95% |
| Lighthouse (published) | ≥ 90 | ≥ 95 |
| Support tickets / 100 accounts | < 5 | < 3 |

### 12.3 Metrics deliberately not tracked

- **Impressions / reach.** Vanity. We do not have a marketing surface.
- **Total registered users.** Grows from giveaways and never correlates with
  revenue.
- **Editor session duration.** A longer session can mean either engagement or
  confusion. Measured with user interviews, not analytics.

---

## 13. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | A free user publishes a scam/phishing page | Medium | High — brand, possible takedown pressure | Report button, suspend on credible complaint, ToS enforcement, no anonymous hosting guarantees |
| R2 | Certificate authority rate limits exhausted by a targeted DNS attack | Medium | **Critical** — no customer can get a certificate | The `/api/caddy/ask` allow-list (domains must be connected to a *published* site) plus 5 connects/hr/user. **This is the single highest-impact control in the system** |
| R3 | A payment webhook is missed; customer paid but not upgraded | Medium | High — direct revenue loss and a support burden | `webhook_events` records every delivery; `checkout_intents` links purchase to user; hourly reconciliation cron; idempotent upserts |
| R4 | Competitor copies the model | High | Low | Not a moat. Defensibility is operational reliability and templates |
| R5 | Solo operator unavailable | Medium | **Critical** — bus factor of one | Documented runbooks, automated deploys, no manual production steps in the critical path |
| R6 | Supabase pricing change at scale | Medium | Medium | Postgres is portable; self-hosting remains an option at 10× revenue |
| R7 | Dodo raises fees or deprecates the API | Low | Medium | Stripe is a drop-in swap; only the webhook state machine is provider-specific |
| R8 | Templates take longer than estimated and the funnel stalls | **High** | High | Templates are the growth hook. Scope to 6 good ones, not 30 mediocre. Ship F1–F9 first — they already work |
| R9 | Free tier attracts zero publishers (signups without launches) | Medium | Medium | Design-partner interviews before launch; if signup→published is < 40% at day 30, the problem is onboarding, not acquisition |
| R10 | Hosting costs outrun revenue at low volume | Low | Low | ~90% gross margin. Not a realistic risk at this scale |

### 13.1 Legal exposure

- **Not a safe harbour.** Hosting arbitrary content means DMCA exposure and
  possible takedown obligations. Requires a real ToS, an abuse contact, and a
  repeat-infringer policy. **This is legal work, not code.**
- **Payments:** Dodo as merchant of record shifts most tax and chargeback
  liability to them, but chargebacks still land on us.
- **GDPR/CCPA:** account deletion and data export are **not implemented**.
  Required before EU/UK growth.

---

## 14. Roadmap

Ordered by dependency, not by appeal. Each phase has a single falsifiable goal.

### Phase A — Launch *(2 weeks)*

**Goal: 200 pages live.**

- F1–F9 are built; make them trustworthy
- Generated database types; remove every `as` cast
- Wire the analytics SQL views into the UI (the views exist and are unused)
- Legal pages, ToS acceptance, abuse contact
- Observability: error tracking, `/api/health` monitoring, cert-failure alerting
- Password reset

**Exit criteria:** signup → published median < 10 min; free → published > 55%;
no support ticket category above 20% of volume.

### Phase B — Templates *(1–2 weeks)*

**Goal: the growth loop starts.**

- `templates` table exists. Build the gallery and picker
- 6 templates across categories, each genuinely distinct
- Template as a conversion hook: "start from a template" on the dashboard
- Visual regression test asserting template and published output are identical

**Exit criteria:** > 40% of new sites start from a template. This is the
biggest single lever on signup→published.

### Phase C — Monetise *(1 week)*

**Goal: first paying customers.**

- Enable Dodo checkout in live mode
- Register the webhook; verify against live event payloads
- In-app downgrade and cancel
- Email capture (F10) — the next paid feature
- Remove unimplemented claims from the pricing page

**Exit criteria:** a real purchase produces a verified upgrade; a real
cancellation downgrades at period end, not immediately.

### Phase D — Retain *(2 weeks)*

**Goal: churn < 5%.**

- Autosave and unsaved-changes guard (**the largest source of lost-work complaints**)
- Mobile navigation (**currently unreachable on a phone**)
- Accessibility: labelled inputs, modal focus traps, keyboard carousel
- A/B testing (Pro+)

### Phase E — Scale *(ongoing)*

**Goal: 12,000 pages, $6k MRR.**

- Server Component renderer; `next/image`; sitemap and JSON-LD per site
- Public pages behind a CDN so customer traffic never touches EC2
- Second page type: a changelog or "about" section
- Referral: additional free pages for a paid referral

### Phase F — Adjacent

Only if Phase E is funded. Explicitly *not* prioritised: a full website
builder, native apps, a marketplace, white-label agency tooling. Each is a
different company.

---

## 15. Dependencies

### 15.1 Internal

| Depends on | Needed for | Status |
|---|---|---|
| Hostinger DNS (`@`, `*`, `cname`) | All HTTPS serving | Not configured |
| EC2 security group (80, 443) | Let's Encrypt challenges | Not configured |
| Cloudflare DNS-01 token | Wildcard certificate | Not obtained |
| `ACME_CONTACT_EMAIL` | Expiry notices; a silent renewal failure takes the site down | Not set |
| `CRON_SECRET` | Subscription expiry, analytics rollup | Not generated |
| Supabase redirect URLs | Email confirmation works at all | Not configured |
| Dodo product ids in `products` | Checkout | Not set |

**Every one of these is a hard launch dependency, and all are configuration
rather than engineering.** The application is not the constraint.

### 15.2 Third-party

| Service | Purpose | Failure impact | Alternative |
|---|---|---|---|
| Supabase | DB, auth, RLS | **Total outage** | Self-host Postgres + auth |
| Dodo Payments | Subscriptions | No new revenue; existing subs unaffected | Stripe — only the webhook state machine is provider-specific |
| Cloudflare R2 | Uploads | Logos/screenshots fail; pages otherwise live | Any S3 |
| Hostinger DNS | Name resolution | **Total outage** | Any registrar |
| EC2 | Compute | **Total outage** | Any host |
| Caddy | TLS | No new certificates; existing unaffected until expiry | nginx + certbot, but loses on-demand TLS |

**Single points of failure: Supabase, Hostinger DNS, EC2.** R2 and Dodo degrade
gracefully. A caching CDN in front of published customer pages would remove EC2
from the critical read path.

---

## 16. Assumptions

Stated explicitly so they can be falsified rather than assumed into existence.

| # | Assumption | Test |
|---|---|---|
| A1 | Indie developers will use a hosted subdomain rather than self-hosting | Signup→published > 55% |
| A2 | "Second app" is the conversion trigger, not feature walls | Free→paid conversion on the second-page rejection |
| A3 | Deep customisation beats more templates | A/B: constrained editor vs. template picker |
| A4 | $3.99 is above the impulse threshold and below the "too cheap to trust" threshold | Conversion rate vs. a $2.99 test |
| A5 | Cookieless analytics is a *selling point*, not a compromise | Support and sales questions mentioning it |
| A6 | Custom domains are worth paying for specifically | Pro conversion segmented by domain-connect attempts |
| A7 | Structured fields are sufficient; free layout is not needed | Support requests for arbitrary layout |
| A8 | Solo operation is viable to 10,000 pages | Infra cost stays under 10% of revenue |

**A3 and A7 are the load-bearing ones.** If customisation depth is not the
differentiator, the product is a template picker competing on price against
AI-generated page builders, which is a losing position.

---

## 17. Open questions

| # | Question | Why it matters | Decide by |
|---|---|---|---|
| Q1 | Do we need a logo/image editor, or is upload sufficient? | Upload-only is a real friction point for non-designers | After 50 design-partner sessions |
| Q2 | Do we need a custom 404/coming-soon page per site? | indie devs expect it; it is cheap to add | Phase E |
| Q3 | Is a `blog` section worth it, or is it a different product? | Scope discipline says no | Never, probably |
| Q4 | Do we support subdirectories, or only subdomains and domains? | `user.com/myapp` is a real ask from agencies | Only if demand appears |
| Q5 | What is the abuse threshold before we take action? | Under-policing risks R1; over-policing loses paying users | Before launch |
| Q6 | Do we offer a one-time lifetime deal? | Precedent in the indie market; consumes support forever | No, unless cash-flow critical |
| Q7 | Is email capture on Basic a retention feature or a paid feature? | Changes the Basic/Pro line | Phase C |

---

## 18. Related documents

| Document | Purpose |
|---|---|
| `REMAINING-WORK.md` | Complete outstanding work, ordered by dependency |
| `CHANGELOG.md` | Every change made during remediation |
| `PRODUCTION_PLAN.md` | The original 10-phase engineering plan |
| `docs/DEPLOY.md` | Webhook URL, event list, env, deploy, go-live checklist |
| `docs/DNS-SETUP.md` | Hostinger hPanel walkthrough |
| `supabase/schema.sql` | Authoritative schema. Convergent and idempotent |
