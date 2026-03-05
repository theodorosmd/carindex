-- Index pour accélérer la requête "raw_listings non traités" (évite statement timeout)
CREATE INDEX IF NOT EXISTS idx_raw_listings_unprocessed
  ON raw_listings (scraped_at)
  WHERE processed_at IS NULL;
