#!/usr/bin/env node
/**
 * Run bytbil migration 003 via Supabase Management API
 * Requires: SUPABASE_ACCESS_TOKEN (Personal Access Token from https://supabase.com/dashboard/account/tokens)
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node src/scripts/run-bytbil-migration-003-api.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '../../../../../Downloads/bytbil/supabase/migrations/003_fix_rpc_return_types.sql');
const PROJECT_REF = 'jgrebihiurfmuhfftsoa';

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN required.');
    console.error('Get it from: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

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
  console.log('✅ Migration 003 applied successfully');
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
