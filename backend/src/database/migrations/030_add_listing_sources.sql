-- Migration 030: listing_sources - multiple links per listing (same car on different scrapers)
-- When bilweb.se and autoscout24.se both have the same BMW X3, we store one listing with multiple sources.

CREATE TABLE IF NOT EXISTS listing_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  source_platform VARCHAR(50) NOT NULL,
  source_listing_id VARCHAR(255) NOT NULL,
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_platform, source_listing_id),  -- one ad per source (no duplicate bilweb ads)
  UNIQUE(listing_id, source_platform)          -- one link per platform per listing
);

CREATE INDEX IF NOT EXISTS idx_listing_sources_listing ON listing_sources(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_sources_platform ON listing_sources(source_platform);

COMMENT ON TABLE listing_sources IS 'Links between listings and their source URLs - same car can appear on bilweb, autoscout24, etc.';

-- Backfill: each existing listing gets one row in listing_sources (its primary source)
INSERT INTO listing_sources (listing_id, source_platform, source_listing_id, url)
SELECT id, source_platform, source_listing_id, COALESCE(url, '')
FROM listings
ON CONFLICT (listing_id, source_platform) DO NOTHING;
