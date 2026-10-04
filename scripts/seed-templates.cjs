#!/usr/bin/env node
/**
 * Seed the public.templates table from the built-in template definitions.
 *
 * Usage:
 *   DATABASE_URL='postgresql://...' node scripts/seed-templates.cjs
 *
 * Or put DATABASE_URL in .env.local, which is gitignored.
 */

const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { Client } = require('pg');

const ROOT = join(__dirname, '..');

/**
 * Minimal .env.local reader. Hand-rolled rather than dotenv because the project
 * takes no dependency on it; this mirrors scripts/db-sync.mjs. Matching quotes
 * are stripped.
 */
function parseEnvFile() {
  const path = join(ROOT, '.env.local');
  if (!existsSync(path)) return {};

  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Resolve DATABASE_URL, preferring a real environment variable over the file.
 */
function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL || parseEnvFile().DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Refusing to guess a database.\n');
    console.error('Supabase: Project Settings -> Database -> Connection string');
    console.error('  -> Connection URI -> URI (not the session pooler).\n');
    console.error('Then either:');
    console.error('  DATABASE_URL=\'postgresql://...\' node scripts/seed-templates.cjs');
    console.error('  or add DATABASE_URL to .env.local (gitignored).');
    process.exit(1);
  }
  return url;
}

// Built-in templates catalogue cleared of legacy inconsistent templates.
const BUILTIN_TEMPLATES = [];

async function seed() {
  const client = new Client({
    connectionString: requireDatabaseUrl(),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase DB for template seeding.');

    if (BUILTIN_TEMPLATES.length === 0) {
      console.log('No builtin templates queued for seeding. Legacy templates cleared.');
      const res = await client.query('SELECT id, name, category, sort_order FROM public.templates ORDER BY sort_order ASC;');
      console.log('Current templates in DB:');
      console.table(res.rows);
      return;
    }

    for (const t of BUILTIN_TEMPLATES) {
      const query = `
        INSERT INTO public.templates (id, name, tagline, category, preview_image_url, is_active, sort_order, content, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          tagline = EXCLUDED.tagline,
          category = EXCLUDED.category,
          preview_image_url = EXCLUDED.preview_image_url,
          is_active = EXCLUDED.is_active,
          sort_order = EXCLUDED.sort_order,
          content = EXCLUDED.content,
          updated_at = NOW();
      `;
      await client.query(query, [
        t.id,
        t.name,
        t.tagline,
        t.category,
        t.preview_image_url,
        t.is_active,
        t.sort_order,
        JSON.stringify(t.content)
      ]);
      console.log(`Seeded template: ${t.id} (${t.name})`);
    }

    const res = await client.query('SELECT id, name, category, sort_order FROM public.templates ORDER BY sort_order ASC;');
    console.log('Successfully seeded! Current templates in DB:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error seeding templates:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
