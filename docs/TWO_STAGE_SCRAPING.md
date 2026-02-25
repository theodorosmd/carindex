# Two-Stage Scraping Architecture

Carindex uses a two-stage approach for scraping and processing car listings.

## Overview

| Stage | Description | Storage |
|-------|--------------|---------|
| **Stage 1 – Scraping** | Collect all listings from each platform, store as-is | `raw_listings` table |
| **Stage 2 – Processing** | Apply business logic (mapping, normalization, matching) | `listings` table |

## Benefits

1. **Raw data preservation** – Original scraped payload is kept for debugging, auditing, and re-processing
2. **Separate concerns** – Schema changes to listings don't affect scraping
3. **Re-processing** – Change matching logic and re-run Stage 2 without re-scraping
4. **No daily migrations** – Migrations only when schema changes; daily jobs do upserts on existing tables

## Database Schema

### raw_listings (Stage 1)

```sql
- id, source_platform, source_listing_id
- run_id (optional, links to scraper_runs)
- raw_payload (JSONB) – full scraped item, no transformation
- scraped_at, processed_at, created_at, updated_at
- UNIQUE(source_platform, source_listing_id)
```

### listings (Stage 2)

Processed, normalized listings used by search, evaluations, and the rest of the app.

## Flow

1. **Scrapers** (Apify, Blocket, Bilweb, Bytbil, etc.) → save to `raw_listings` first, then process to `listings` in the same run
2. **Processor job** (cron every 15 min) – processes any `raw_listings` where `processed_at IS NULL`
3. **Webhook** (Apify) – saves raw first, then delta detection and listing updates

## Migration

Run once to create the `raw_listings` table:

```bash
cd backend
node src/scripts/run-migration-017.js
```

Or run the SQL manually in Supabase SQL Editor:
`backend/src/database/migrations/017_add_raw_listings.sql`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ingest/raw` | Stage 1: Save raw scraped items. Body: `{ items: [...], source_platform: "autoscout24" }` |
| POST | `/api/v1/ingest/process-raw` | Stage 2: Trigger processor manually. Query: `?limit=500&source_platform=blocket` |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_RAW_LISTINGS_PROCESSOR` | `true` | Enable the cron job that processes raw → listings |
| `PROCESS_RAW_LISTINGS_CRON` | `*/15 * * * *` | Cron schedule (every 15 min) |
| `PROCESS_RAW_LISTINGS_BATCH_SIZE` | `500` | Max raw listings per run |

## Re-processing

To re-process raw data (e.g. after updating mapping logic):

```sql
-- Reset processed_at for a platform
UPDATE raw_listings SET processed_at = NULL WHERE source_platform = 'autoscout24';
```

Then run the processor (via cron or POST `/api/v1/ingest/process-raw`).
