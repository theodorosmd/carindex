-- Table to track scraper runs (ingestion sessions)
CREATE TABLE IF NOT EXISTS scraper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_platform VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- running | success | failed
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  total_scraped INTEGER DEFAULT 0,
  total_saved INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  error_message TEXT,
  webhook_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_source ON scraper_runs(source_platform);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status ON scraper_runs(status);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started_at ON scraper_runs(started_at DESC);
