#!/usr/bin/env node
/**
 * Run migration 017 - add raw_listings table for two-stage scraping
 * Usage: node src/scripts/run-migration-017.js
 *
 * Or run the SQL manually in Supabase SQL Editor:
 * https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    console.error('For Supabase: get the URL from Project Settings > Database');
    process.exit(1);
  }

  const sqlPath = join(__dirname, '../database/migrations/017_add_raw_listings.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  const client = new pg.Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Migration 017 completed: raw_listings table created');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
