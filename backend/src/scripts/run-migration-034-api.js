#!/usr/bin/env node
/**
 * Run migration 034 (widen net_margin_pct)
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
    console.error('SUPABASE_ACCESS_TOKEN required');
    process.exit(1);
  }
  const sql = fs.readFileSync(
    path.join(__dirname, '../database/migrations/034_arbitrage_opp_net_margin_pct.sql'),
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
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  console.log('✅ Migration 034 applied');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
