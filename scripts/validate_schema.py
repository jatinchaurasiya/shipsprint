#!/usr/bin/env python3
"""
Validate supabase/schema.sql without a live database.

`CREATE TABLE IF NOT EXISTS` is only *partially* idempotent: if the table
exists, Postgres skips the statement including its column list. The first
version of schema.sql therefore failed against a database where `plans`
already existed, with:

    ERROR: 42703: column "tagline" of relation "plans" does not exist

This script parses the file with pglast (a real PostgreSQL parser) so syntax
errors are caught locally instead of in the Supabase SQL editor, and asserts
the convergence properties that make the script safe to re-run.

Usage:  python scripts/validate_schema.py
Exit code 0 = valid, 1 = problems found.
"""

import re
import sys
from pathlib import Path

try:
    from pglast import parse_sql
except ImportError:  # pragma: no cover
    print("pglast is not installed. Run: pip install pglast")
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "supabase" / "schema.sql"
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"


def read_migrations() -> str:
    """All migration files concatenated, oldest first."""
    if not MIGRATIONS_DIR.is_dir():
        return ""
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(MIGRATIONS_DIR.glob("*.sql"))
    )

GREEN, RED, YELLOW, CYAN, BOLD, RESET = (
    "\033[32m", "\033[31m", "\033[33m", "\033[36m", "\033[1m", "\033[39m"
)

problems: list[str] = []
notes: list[str] = []


def head(text: str) -> None:
    print(f"\n{BOLD}{text}{RESET}")


def ok(text: str) -> None:
    print(f"  {GREEN}ok{RESET}   {text}")


def bad(text: str) -> None:
    print(f"  {RED}FAIL{RESET} {text}")
    problems.append(text)


def warn(text: str) -> None:
    print(f"  {YELLOW}warn{RESET} {text}")
    notes.append(text)


def info(text: str) -> None:
    print(f"  {CYAN}info{RESET} {text}")


# ---------------------------------------------------------------------------
# 1. Parse
# ---------------------------------------------------------------------------
head("1. Syntax")

if not SCHEMA.exists():
    bad(f"{SCHEMA} not found")
    sys.exit(1)

sql = SCHEMA.read_text(encoding="utf-8")
migrations_sql = read_migrations()
info(f"{len(sql.splitlines())} lines")

# pglast cannot parse psql meta-commands, so strip them.
stripped = re.sub(r"\\copy\b.*", "", sql)

try:
    statements = parse_sql(stripped)
    ok(f"parses as PostgreSQL ({len(statements)} statements)")
except Exception as exc:  # noqa: BLE001
    bad(f"parse error: {exc}")
    sys.exit(1)

# ---------------------------------------------------------------------------
# 2. Convergence: every table gets ADD COLUMN IF NOT EXISTS for each column
#    declared in its CREATE TABLE.
# ---------------------------------------------------------------------------
head("2. Convergence (why the script is safe to re-run)")

create_tables = re.findall(
    r"create\s+table\s+if\s+not\s+exists\s+([\w.]+)\s*\((.*?)\n\);",
    sql,
    re.IGNORECASE | re.DOTALL,
)
info(f"{len(create_tables)} create-table-if-not-exists statements")

for table, body in create_tables:
    # Top-level column definitions only, one per line, not constraint lines.
    columns = []
    for raw in body.split("\n"):
        line = raw.strip().rstrip(",")
        if not line:
            continue
        # Skip table-level constraints.
        if re.match(
            r"^(constraint|primary\s+key|unique|check|foreign\s+key)\b", line, re.IGNORECASE
        ):
            continue
        match = re.match(r"^(\w+)\s+\S", line)
        if match:
            columns.append((match.group(1), line))

    if not columns:
        warn(f"{table}: could not parse any columns")
        continue

    section = sql.split(f"create table if not exists {table}", 1)[-1]

    # A column is only *convergable* if it can be added to a table that already
    # exists. A NOT NULL column with no default cannot: Postgres rejects it
    # against existing rows. Those are covered by the CREATE TABLE guard
    # instead, because a table missing its primary key was never created.
    addable, identity = [], []
    for column, line in columns:
        not_null = bool(re.search(r"\bnot\s+null\b", line, re.IGNORECASE))
        has_default = bool(re.search(r"\bdefault\b", line, re.IGNORECASE))
        is_key = bool(re.search(r"\bprimary\s+key\b", line, re.IGNORECASE))
        if is_key or (not_null and not has_default):
            identity.append(column)
        else:
            addable.append(column)

    missing = []
    for column in addable:
        pattern = (
            rf"alter\s+table\s+{re.escape(table)}\s+"
            rf"add\s+column\s+if\s+not\s+exists\s+{re.escape(column)}\b"
        )
        if not re.search(pattern, section, re.IGNORECASE):
            missing.append(column)

    if missing:
        bad(
            f"{table}: {len(missing)} addable column(s) missing "
            f"'ADD COLUMN IF NOT EXISTS' -> {', '.join(missing)}"
        )
    else:
        detail = f"{len(addable)} addable columns converge"
        if identity:
            detail += f" ({len(identity)} key column(s) covered by the CREATE guard)"
        ok(f"{table}: {detail}")


# ---------------------------------------------------------------------------
# 3. Data migration runs before constraints
# ---------------------------------------------------------------------------
head("3. Ordering (data migration must precede CHECK constraints)")

def section_index(pattern: str) -> int:
    # re.MULTILINE is required: without it `^` anchors to the start of the file
    # rather than the start of a line, so every section header misses.
    match = re.search(pattern, sql, re.IGNORECASE | re.MULTILINE)
    return match.start() if match else -1

migrate_idx = section_index(r"^--\s*12\.\s*DATA MIGRATION")
constraint_idx = section_index(r"^--\s*13\.\s*CONSTRAINTS")

if migrate_idx == -1 or constraint_idx == -1:
    bad("could not locate the DATA MIGRATION or CONSTRAINTS section")
elif migrate_idx > constraint_idx:
    bad("CONSTRAINTS section appears before DATA MIGRATION")
else:
    ok("data migration precedes constraints")

# Each status vocabulary rename must be present.
renames = {
    "'pending'  then 'pending_dns'": r"when\s+'pending'\s+then\s+'pending_dns'",
    "'verified' then 'active'": r"when\s+'verified'\s+then\s+'active'",
    "ssl_status 'pending_validation'": r"set\s+ssl_status\s*=\s*'pending'",
    "site status fallback": r"set\s+status\s*=\s*'draft'",
    "subscription status fallback": r"set\s+status\s*=\s*'expired'",
    "event_type fallback": r"set\s+event_type\s*=\s*'page_view'",
    "plan_id fallback": r"set\s+plan_id\s*=\s*'free'",
    "site_limit floor": r"set\s+site_limit\s*=\s*1",
}
for label, pattern in renames.items():
    if re.search(pattern, sql, re.IGNORECASE):
        ok(f"migrates {label}")
    else:
        bad(f"no migration for {label}; an existing CHECK may reject old values")

# ---------------------------------------------------------------------------
# 4. The constraints that were actually missing
# ---------------------------------------------------------------------------
head("4. Required constraints and indexes")

required = [
    ("unique index on domain_verifications(site_id)",
     r"create\s+unique\s+index\s+if\s+not\s+exists\s+idx_domain_verifications_site\s+on\s+public\.domain_verifications\s*\(\s*site_id\s*\)"),
    ("unique index on products(dodo_product_id)",
     r"create\s+unique\s+index\s+if\s+not\s+exists\s+idx_products_dodo_id"),
    ("unique index on profiles(dodo_customer_id)",
     r"create\s+unique\s+index\s+if\s+not\s+exists\s+idx_profiles_dodo_customer"),
    ("index on sites(user_id, created_at)",
     r"idx_sites_user_created"),
    ("index on subscriptions(user_id)",
     r"idx_subscriptions_user"),
    ("expiry index on subscriptions(current_period_end)",
     r"idx_subscriptions_expiring"),
    ("site-limit trigger", r"create\s+trigger\s+trg_enforce_site_limit"),
    ("reserved-slug trigger", r"create\s+trigger\s+trg_reject_reserved_slug"),
    ("handle_new_user search_path pinned",
     r"handle_new_user\(\).*?security\s+definer\s+set\s+search_path"),
    ("enforce_site_limit search_path pinned",
     r"enforce_site_limit\(\).*?security\s+definer\s+set\s+search_path"),
    ("sites.status CHECK", r"sites_status_check"),
    ("sites.content size CHECK", r"sites_content_size_check"),
    ("sites.slug format CHECK", r"sites_slug_format_check"),
    ("analytics_events.event_type CHECK", r"analytics_events_type_check"),
    ("plans.site_limit > 0 CHECK", r"plans_site_limit_check"),
    ("3 RLS policies use (select auth.uid())",
     r"\(select\s+auth\.uid\(\)\)"),
]
for label, pattern in required:
    if re.search(pattern, sql, re.IGNORECASE | re.DOTALL):
        ok(label)
    else:
        bad(f"missing: {label}")

# ---------------------------------------------------------------------------
# 5. Plan / product split
# ---------------------------------------------------------------------------
head("5. Plan and product split (yearly billing)")

tiers = set(re.findall(r"\('(free|basic|pro)',\s*'", sql))
skus = set(re.findall(r"\('([a-z]+_(?:monthly|yearly))',\s*'(?:basic|pro)'", sql))

if tiers == {"free", "basic", "pro"}:
    ok("three plan tiers seeded")
else:
    bad(f"expected tiers free/basic/pro, found {sorted(tiers)}")

expected_skus = {"basic_monthly", "basic_yearly", "pro_monthly", "pro_yearly"}
if skus == expected_skus:
    ok("four product SKUs seeded")
else:
    bad(f"expected {sorted(expected_skus)}, found {sorted(skus)}")

prices = dict(
    re.findall(r"\('(\w+_(?:monthly|yearly))',\s*'(?:basic|pro)',\s*'(?:monthly|yearly)',\s*'[^']*',\s*(\d+)", sql)
)
expected_prices = {
    "basic_monthly": "399",
    "basic_yearly": "3599",
    "pro_monthly": "999",
    "pro_yearly": "9799",
}
if prices == expected_prices:
    ok("prices match the live figures ($3.99 / $35.99 / $9.99 / $97.99)")
else:
    bad(f"price mismatch: expected {expected_prices}, found {prices}")

for sku in expected_skus:
    if re.search(rf"update\s+public\.products\s+set\s+dodo_product_id.*where\s+id\s*=\s*'{sku}'", sql, re.IGNORECASE):
        ok(f"product-id mapping present for {sku}")
    else:
        bad(f"no product-id mapping instruction for {sku}")

# ---------------------------------------------------------------------------
# 6. RLS coverage
# ---------------------------------------------------------------------------
head("6. Row level security")

tables = re.findall(r"'([a-z_]+)'(?=[,\]\s]*loop|,\s*'|\]\s*loop)", sql)
enabling = re.search(r"foreach t in array array\[(.*?)\]", sql, re.DOTALL)
if enabling:
    covered = set(re.findall(r"'(\w+)'", enabling.group(1)))
    expected = {
        "plans", "products", "profiles", "sites", "subscriptions",
        "analytics_events", "domain_verifications", "checkout_intents",
        "webhook_events", "audit_log", "templates", "telemetry_daily",
    }
    missing = expected - covered
    if missing:
        bad(f"RLS not enabled on: {sorted(missing)}")
    else:
        ok(f"RLS enabled on all {len(expected)} tables")
else:
    bad("could not find the RLS enablement block")

for table, label in [
    ("subscriptions", "entitlements"),
    ("analytics_events", "telemetry"),
    ("domain_verifications", "verification rows"),
    ("checkout_intents", "checkout intents"),
    ("plans", "reference data"),
]:
    if re.search(rf"revoke\s+insert,?\s*update,?\s*delete\s+on\s+public\.{table}\b", sql, re.IGNORECASE) or \
       re.search(rf"revoke\s+insert,?\s*update,?\s*delete\s+on\s+public\.plans,", sql, re.IGNORECASE):
        ok(f"client writes revoked on {table} ({label})")
    else:
        warn(f"no explicit revoke on {table}; verify no INSERT policy grants it")

# ---------------------------------------------------------------------------
# 7. Foreign keys guarded by column pair, never by constraint name
# ---------------------------------------------------------------------------
head("7. Foreign key guards")

# `create table ... user_id uuid references public.profiles (id)` already makes
# Postgres name that constraint `sites_user_id_fkey`. An idempotent guard of the
# form `if not exists (select 1 from pg_constraint where conname =
# 'sites_user_fkey')` therefore never matches it and appends a SECOND constraint
# for the same column pair. PostgREST then refuses the relationship outright:
#
#   PGRST201: Could not embed because more than one relationship was found
#   for 'sites' and 'profiles'
#
# That is not cosmetic. `/site/[slug]` embedded the owner profile inline, so
# the query errored, the page treated "error" and "no such site" identically, and
# every published landing page answered "Page Not Found" while /api/health kept
# reporting the database healthy.
named_fk_guards = sorted(
    set(re.findall(r"conname\s*=\s*'([a-z0-9_]+_fkey)'", sql, re.IGNORECASE))
)
if named_fk_guards:
    for name in named_fk_guards:
        bad(
            f"foreign key guarded by constraint name '{name}': an inline "
            "`references` clause already creates a constraint for that column, "
            "so this guard adds a duplicate; guard the column pair instead"
        )
else:
    ok("no foreign key guard is keyed by constraint name")

for label, pattern in (
    (
        "sites.user_id -> profiles.id guarded by column pair",
        r"conrelid\s*=\s*'public\.sites'::regclass.{0,400}?confrelid\s*=\s*'public\.profiles'::regclass.{0,400}?attname\s*=\s*'user_id'",
    ),
    (
        "products.plan_id -> plans.id guarded by column pair",
        r"conrelid\s*=\s*'public\.products'::regclass.{0,400}?confrelid\s*=\s*'public\.plans'::regclass.{0,400}?attname\s*=\s*'plan_id'",
    ),
):
    if re.search(pattern, sql, re.IGNORECASE | re.DOTALL):
        ok(label)
    else:
        bad(f"missing: {label}")

# The repair migration must exist, otherwise an already-provisioned database
# keeps the duplicates that this file now refuses to create.
if re.search(
    r"drop\s+constraint", migrations_sql, re.IGNORECASE
) and "duplicate" in migrations_sql.lower():
    ok("a migration exists that drops duplicate foreign keys")
else:
    warn(
        "no migration drops duplicate foreign keys; an existing database will "
        "keep the duplicates this file no longer creates"
    )

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
head("Summary")
if problems:
    print(f"  {RED}{len(problems)} problem(s){RESET}")
    for problem in problems:
        print(f"    - {problem}")
    sys.exit(1)

print(f"  {GREEN}schema.sql is valid and convergent{RESET}")
if notes:
    print(f"  {YELLOW}{len(notes)} note(s){RESET}")
sys.exit(0)
