#!/usr/bin/env node
/**
 * Run migration via Supabase Management API.
 * Requires: SUPABASE_ACCESS_TOKEN (from https://supabase.com/dashboard/account/tokens)
 * Usage: node scripts/run-migration-via-api.js [migration-file]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'jgrebihiurfmuhfftsoa';

const migrationFile = process.argv[2] || path.join(__dirname, '../src/database/migrations/025_add_cochesnet_source_to_auto_scrapers.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

if (!token || !token.startsWith('sbp_')) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Get one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql })
}).then(async r => {
  const data = await r.json().catch(() => ({}));
  if (r.ok) {
    console.log('Migration applied successfully');
    return;
  }
  console.error('Migration failed:', r.status, data.message || JSON.stringify(data));
  process.exit(1);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
