#!/usr/bin/env node
/**
 * Run bytbil migration 003 (fix RPC return types) on Supabase
 * Usage: cd backend && node src/scripts/run-bytbil-migration-003.js
 * Requires DATABASE_URL in .env (or run manually: see bytbil/APPLY_MIGRATION_003.md)
 */
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '../../../../../Downloads/bytbil/supabase/migrations/003_fix_rpc_return_types.sql');

async function main() {
  let url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  // Fallback: try pooler if direct db.*.supabase.co fails (IPv4/DNS)
  if (!url) {
    console.error('DATABASE_URL or SUPABASE_DB_URL required in backend/.env');
    process.exit(1);
  }
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = new pg.Client({ connectionString: url });

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Migration 003 applied successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    console.error('→ Run manually: bytbil/APPLY_MIGRATION_003.md');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
