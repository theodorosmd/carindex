#!/usr/bin/env node
/**
 * Create mobile_de_fetch_queue table and alter listings.displacement
 * Requires: SUPABASE_ACCESS_TOKEN (Personal Access Token from https://supabase.com/dashboard/account/tokens)
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node src/scripts/run-mobile-de-queue-migration.js
 */
const PROJECT_REF = 'jgrebihiurfmuhfftsoa';

const SQL = `
CREATE TABLE IF NOT EXISTS mobile_de_fetch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  year INTEGER,
  price DECIMAL(12,2),
  mileage INTEGER,
  images JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'retry', 'processing', 'ok', 'error')),
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  last_error TEXT,
  last_attempt_at TIMESTAMP,
  locked_until TIMESTAMP,
  locked_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mobilede_queue_status ON mobile_de_fetch_queue(status);
CREATE INDEX IF NOT EXISTS idx_mobilede_queue_next_retry ON mobile_de_fetch_queue(next_retry_at) WHERE status IN ('pending', 'retry');
CREATE INDEX IF NOT EXISTS idx_mobilede_queue_available ON mobile_de_fetch_queue(created_at) WHERE status IN ('pending', 'retry') AND (next_retry_at IS NULL OR next_retry_at <= NOW());
ALTER TABLE listings ALTER COLUMN displacement TYPE DECIMAL(6,2);
`;

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN required.');
    console.error('Get it from: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  const data = await res.json();
  console.log('Migration applied successfully');
  if (data?.result) console.log(JSON.stringify(data.result, null, 2));
}

main().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
