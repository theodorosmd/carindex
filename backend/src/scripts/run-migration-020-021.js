#!/usr/bin/env node
/**
 * Run migrations 020 (queue) + 021 (displacement)
 * Usage: node src/scripts/run-migration-020-021.js
 *
 * Requires DATABASE_URL in .env (Supabase: Project Settings > Database)
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../database/migrations');

async function runMigration(client, name) {
  const sql = readFileSync(join(migrationsDir, name), 'utf8');
  await client.query(sql);
  console.log(`✅ ${name}`);
}

async function main() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('DATABASE_URL or SUPABASE_DB_URL required in .env');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await runMigration(client, '020_add_mobile_de_fetch_queue.sql');
    await runMigration(client, '021_fix_displacement_column.sql');
    console.log('✅ Migrations 020+021 completed');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
