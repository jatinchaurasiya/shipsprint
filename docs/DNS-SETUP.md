# DNS setup on Hostinger

`shipsprint.site` is on Hostinger, so these steps use hPanel. Everything here
is a DNS record — no file changes, no code.

**You need your server's public IP address first.** If you don't have the EC2
box up yet, you can add the records now and point them at the IP later.

---

## What to add

Three `A` records. All three point at the same IP.

| Type | Name | Points to | Why |
|---|---|---|---|
| `A` | `@` | your server IP | The dashboard: `shipsprint.site` |
| `A` | `*` | your server IP | Every free user gets `their-slug.shipsprint.site` |
| `A` | `cname` | your server IP | Where paying customers point their own custom domain |

The `*` record is the important one. It is a **single wildcard record**, and
Caddy uses it to issue **one** wildcard certificate covering all
`*.shipsprint.site`. So every free user gets a working HTTPS subdomain for
zero per-site cost and zero extra DNS.

---

## Step by step in hPanel

1. Log in at **hostinger.com** → hPanel.
2. Left sidebar → **Website** → **Domains** → click **Manage** next to
   `shipsprint.site`.
3. Go to the **DNS zone** tab.
4. Delete or ignore any existing `A` / `CNAME` records for `@` and `www` that
   point at Hostinger's parking page. They will conflict.

   > **Keep your Hostinger email records** (`@` MX, `mail`, `imap`, `smtp`,
   > `webmail`, and the `_dmarc`/`_domainkey` TXT records). Deleting those
   > breaks any email address on this domain. Only the website records should
   > change.

5. Click **Add record** three times:

   | Type | Name | Address | TTL |
   |---|---|---|---|
   | `A` | `@` | `YOUR.SERVER.IP` | Default |
   | `A` | `*` | `YOUR.SERVER.IP` | Default |
   | `A` | `cname` | `YOUR.SERVER.IP` | Default |

6. Click **Save zone**.

Leave TTL on default (Hostinger uses 14400 / 4 hours). Setting it very low does
not make propagation meaningfully faster and just adds DNS query load.

---

## A trap worth knowing about

If you are also pointing `www.shipsprint.site` somewhere, **do not add a
`www` record**. `infra/Caddyfile` already handles it — it redirects
`www` → apex. Two records for the same host means one of them silently loses,
and you get a certificate error that is very hard to diagnose from the
browser.

Same for `@`: if Hostinger auto-created an `A` record for `@` pointing at
their parking IP, delete it. Two `A` records for the same name is invalid and
the result is non-deterministic.

---

## Verify

From your own machine (not the Hostinger panel):

```bash
# Should all print your server IP
dig +short shipsprint.site
dig +short anything.shipsprint.site
dig +short cname.shipsprint.site
```

In PowerShell:

```powershell
Resolve-DnsName shipsprint.site -Type A
Resolve-DnsName test.shipsprint.site -Type A
```

**If `anything.shipsprint.site` does not resolve, the wildcard record is
wrong or missing.** That single check tells you whether free subdomains will
work at all, so do it before anything else.

Propagation is usually 5–15 minutes but can take up to 48 hours if your local
resolver cached the old state. If you need to check a specific record right
now, use a public resolver that ignores your cache:

```powershell
Resolve-DnsName test.shipsprint.site -Type A -Server 1.1.1.1
```

---

## What still has to happen before HTTPS works

DNS alone is not enough. The certificate comes from Let's Encrypt, which
requires:

1. **Port 80 and 443 open** on the server, inbound, in the EC2 security group.
   Port 80 is needed for the ACME HTTP challenge; 443 for the redirect.
2. **The app running** behind Caddy, via `docker compose up -d --build`.
3. **`ACME_CONTACT_EMAIL` set** and a **Cloudflare DNS-01 token** in the
   environment, because DNS-01 is the only challenge that can validate a
   wildcard name.

Check the security group too: EC2 → Security Groups → your group → Inbound
Rules. Add:

| Type | Protocol | Port | Source |
|---|---|---|---|
| Custom | TCP | 80 | `0.0.0.0/0` |
| Custom | TCP | 443 | `0.0.0.0/0` |
| Custom | TCP | 22 | your IP only, never `0.0.0.0/0` |

Then confirm Caddy actually issued the cert:

```bash
docker compose logs caddy | grep -i certificate
```

`infra/Caddyfile` ships pointed at the **staging** CA on purpose, so a
misconfiguration cannot burn your Let's Encrypt rate limits (5 duplicate
certs per week, 50 per registered domain). Once you see a successful staging
issuance, delete the `acme_ca` line and restart Caddy for the real one.

---

## Quick reference

```
shipsprint.site      → A → server IP      (dashboard)
*.shipsprint.site    → A → server IP      (free subdomains, ONE cert)
cname.shipsprint.site→ A → server IP      (custom domain target)
```

No `CNAME` record is needed for the wildcard — `A` is correct, and a `CNAME`
cannot exist at the zone apex anyway.
