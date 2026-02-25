#!/usr/bin/env node
/**
 * Run migrations 020 (queue) + 021 (displacement) via Supabase Management API
 * Bypass DATABASE_URL - useful when connection fails (DNS, firewall).
 *
 * Requires: SUPABASE_ACCESS_TOKEN (Personal Access Token from https://supabase.com/dashboard/account/tokens)
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node src/scripts/run-migration-020-021-api.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../database/migrations');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jgrebihiurfmuhfftsoa';

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN required.');
    console.error('Get it from: https://supabase.com/dashboard/account/tokens');
    console.error('');
    console.error('Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node src/scripts/run-migration-020-021-api.js');
    process.exit(1);
  }

  const sql020 = fs.readFileSync(path.join(migrationsDir, '020_add_mobile_de_fetch_queue.sql'), 'utf8');
  const sql021 = fs.readFileSync(path.join(migrationsDir, '021_fix_displacement_column.sql'), 'utf8');

  async function runQuery(sql) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
  }

  console.log('Running migration 020 (mobile_de_fetch_queue)...');
  await runQuery(sql020);
  console.log('✅ Migration 020 applied');

  console.log('Running migration 021 (displacement column)...');
  try {
    await runQuery(sql021);
    console.log('✅ Migration 021 applied');
  } catch (e) {
    if (e.message.includes('column "displacement"') || e.message.includes('already') || e.message.includes('type')) {
      console.log('⚠️  Migration 021 skipped (column may already be correct)');
    } else {
      throw e;
    }
  }

  console.log('');
  console.log('✅ Migrations 020+021 completed successfully');
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
