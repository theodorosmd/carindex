-- Two-stage scraping: Stage 1 stores raw scraped data as-is
-- Stage 2 processing reads from here, applies business logic, writes to listings

CREATE TABLE IF NOT EXISTS raw_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_platform VARCHAR(50) NOT NULL,
  source_listing_id VARCHAR(255) NOT NULL,
  run_id UUID REFERENCES scraper_runs(id) ON DELETE SET NULL,
  raw_payload JSONB NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_platform, source_listing_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_listings_source ON raw_listings(source_platform);
CREATE INDEX IF NOT EXISTS idx_raw_listings_processed ON raw_listings(processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_raw_listings_scraped_at ON raw_listings(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_listings_run_id ON raw_listings(run_id);

COMMENT ON TABLE raw_listings IS 'Stage 1: Raw scraped data stored as-is. Processed by Stage 2 into listings table.';
COMMENT ON COLUMN raw_listings.raw_payload IS 'Full scraped item from platform (no transformation)';
COMMENT ON COLUMN raw_listings.processed_at IS 'When this raw listing was processed into listings (NULL = pending)';
