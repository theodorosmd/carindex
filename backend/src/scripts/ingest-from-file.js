#!/usr/bin/env node
/**
 * Ingest listings directly from JSON/CSV file vers Supabase
 *
 * Usage:
 *   node src/scripts/ingest-from-file.js listings.json
 *   node src/scripts/ingest-from-file.js listings.json --source custom
 *
 * JSON format: array of objects with at least:
 *   - source_platform (string)
 *   - source_listing_id (string)
 *   - brand, model, price, url, location_country
 *
 * Optional: --batch 500 (default 500)
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { upsertListingsBatch } from '../services/ingestService.js';
import { logger } from '../utils/logger.js';

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith('--'));
const sourceOverride = args.includes('--source')
  ? args[args.indexOf('--source') + 1]
  : null;
const batchSize = args.includes('--batch')
  ? parseInt(args[args.indexOf('--batch') + 1], 10) || 500
  : 500;

if (!filePath) {
  console.error('Usage: node ingest-from-file.js <file.json|file.csv> [--source custom] [--batch 500]');
  process.exit(1);
}

function loadData(path) {
  const fullPath = resolve(process.cwd(), path);
  const content = readFileSync(fullPath, 'utf-8');
  if (path.endsWith('.json')) {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : data?.listings || data?.items || [data];
  }
  if (path.endsWith('.csv')) {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, values[i] || null]));
    });
  }
  throw new Error('Unsupported format. Use .json or .csv');
}

function ensureListing(listing) {
  const r = { ...listing };
  if (sourceOverride) r.source_platform = sourceOverride;
  if (!r.source_listing_id && r.id) r.source_listing_id = String(r.id);
  if (!r.source_listing_id && r.link) r.source_listing_id = r.link;
  return r;
}

async function main() {
  logger.info('Loading file', { filePath });
  const items = loadData(filePath);
  logger.info('Loaded', { count: items.length });

  if (items.length === 0) {
    logger.info('No items to ingest');
    process.exit(0);
  }

  let total = 0;
  let errors = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items
      .slice(i, i + batchSize)
      .map(ensureListing);
    const result = await upsertListingsBatch(batch, {
      allowMissingRequired: true,
      useBulkUpsert: batch.length > 1
    });
    total += result.updated + result.created;
    errors += result.errors || 0;
    logger.info(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`, {
      imported: total,
      errors
    });
  }

  logger.info('Ingest completed', { total, errors });
  process.exit(0);
}

main().catch((err) => {
  logger.error('Ingest failed', { error: err.message });
  process.exit(1);
});
