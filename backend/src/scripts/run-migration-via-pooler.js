#!/usr/bin/env node
/**
 * Exécute les migrations 020+021 via le pooler Supabase si la connexion directe échoue.
 * Tente: pooler (eu-central-1, us-east-1) puis DATABASE_URL.
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../database/migrations');

const sql020 = readFileSync(join(migrationsDir, '020_add_mobile_de_fetch_queue.sql'), 'utf8');
const sql021 = readFileSync(join(migrationsDir, '021_fix_displacement_column.sql'), 'utf8');

const projectRef = 'jgrebihiurfmuhfftsoa';
const password = process.env.DATABASE_URL?.match(/postgres:([^@]+)@/)?.[1] || '';
const decodedPassword = decodeURIComponent(password);

const urlsToTry = [
  process.env.DATABASE_URL,
  `postgresql://postgres.${projectRef}:${encodeURIComponent(decodedPassword)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${encodeURIComponent(decodedPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
].filter(Boolean);

async function runWith(client, name, sql) {
  await client.query(sql);
  console.log(`✅ ${name}`);
}

async function main() {
  for (const url of urlsToTry) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      console.log('Connected via', url.includes('pooler') ? 'pooler' : 'direct');
      await runWith(client, '020_add_mobile_de_fetch_queue', sql020);
      await runWith(client, '021_fix_displacement_column', sql021);
      console.log('✅ Migrations OK');
      await client.end();
      process.exit(0);
    } catch (e) {
      console.warn('Failed:', e.message);
      await client.end().catch(() => {});
    }
  }
  console.error('All connection attempts failed');
  process.exit(1);
}

main();
