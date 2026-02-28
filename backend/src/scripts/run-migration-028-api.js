#!/usr/bin/env node
/**
 * Run migration 028 (2ememain source) via Supabase Management API
 * Requires: SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jgrebihiurfmuhfftsoa';

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN required. Get it from https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  const sql = fs.readFileSync(
    path.join(__dirname, '../database/migrations/028_add_2ememain_source_to_auto_scrapers.sql'),
    'utf8'
  );

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

  console.log('✅ Migration 028 applied (2ememain source)');
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
