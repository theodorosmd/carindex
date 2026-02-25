-- Link listings to scraper runs
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES scraper_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listings_run_id ON listings(run_id);
