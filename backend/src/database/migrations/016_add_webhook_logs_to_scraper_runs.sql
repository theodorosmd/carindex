-- Store webhook retry logs for scraper_runs
ALTER TABLE scraper_runs
ADD COLUMN IF NOT EXISTS webhook_attempts JSONB,
ADD COLUMN IF NOT EXISTS webhook_last_status INTEGER,
ADD COLUMN IF NOT EXISTS webhook_last_error TEXT,
ADD COLUMN IF NOT EXISTS webhook_last_sent_at TIMESTAMP;
