-- Remove duplicate foreign key constraints.
--
-- Why: `supabase/schema.sql` creates some tables with an inline
-- `references` clause, which makes Postgres name the constraint
-- `<table>_<column>_fkey`. The idempotent constraint block at the end of that
-- file then added a *second* constraint for the same column under a different
-- name, because its guard checked `conname` instead of the column pair:
--
--   sites.user_id     -> profiles.id   sites_user_id_fkey + sites_user_fkey
--   products.plan_id  -> plans.id      products_plan_id_fkey + products_plan_fkey
--
-- PostgREST cannot choose between two relationships for the same pair and
-- refuses the embed:
--
--   PGRST201: Could not embed because more than one relationship was found
--   for 'sites' and 'profiles'
--
-- `/site/[slug]` selected the site with the owner profile embedded inline, so
-- every published landing page answered "Page Not Found" even though the row
-- was present and published. `/api/health` queries `plans` without an embed and
-- kept reporting the database as healthy, which is why this went unnoticed.
--
-- Fixing the application (lib/site-lookup.ts) restores the pages on its own;
-- this migration removes the underlying schema defect so the ambiguity cannot
-- affect any other query. Keeping one constraint per column pair is safe: the
-- surviving constraint is byte-for-byte the same relationship, so referential
-- integrity is unchanged.
--
-- Constraint names differ between environments (an inline reference yields
-- sites_user_id_fkey, the explicit one yields sites_user_fkey), which is why
-- nothing in the application may depend on them.

do $$
declare
  duplicate record;
  drop_name text;
begin
  for duplicate in
    select c.conrelid,
           array_agg(c.conname order by c.conname) as names
      from pg_constraint c
     where c.contype = 'f'
       and c.connamespace = 'public'::regnamespace
       -- only single-column keys: a composite key duplicated under two names is
       -- rare and ordering it safely needs the full column list.
       and array_length(c.conkey, 1) = 1
     group by c.conrelid, c.confrelid, c.conkey
    having count(*) > 1
  loop
    -- Keep the first name, drop the rest.
    foreach drop_name in array duplicate.names[2 : array_length(duplicate.names, 1)]
    loop
      execute format(
        'alter table %s drop constraint %I',
        duplicate.conrelid::regclass,
        drop_name
      );
      raise notice 'dropped duplicate foreign key % on %', drop_name,
        duplicate.conrelid::regclass;
    end loop;
  end loop;
end
$$;

-- Fail loudly if any duplicate survived, rather than leaving the schema in a
-- state that still breaks embeds.
do $$
declare
  remaining int;
begin
  select count(*) into remaining
    from (
      select c.conrelid, c.confrelid, c.conkey
        from pg_constraint c
       where c.contype = 'f'
         and c.connamespace = 'public'::regnamespace
         and array_length(c.conkey, 1) = 1
       group by c.conrelid, c.confrelid, c.conkey
      having count(*) > 1
    ) duplicates;

  if remaining > 0 then
    raise exception
      'duplicate foreign keys remain: PostgREST will refuse to embed these relationships';
  end if;
end
$$;