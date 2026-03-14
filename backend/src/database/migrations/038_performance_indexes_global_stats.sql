-- 038: Performance indexes for global stats queries + fix avg price RPC
-- These indexes were in 003 but never applied; required by /analytics/global-stats

-- Partial index for counting new active listings by first_seen (immutable, not refreshed by scraper)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_first_seen_active
  ON listings(first_seen DESC)
  WHERE status = 'active';

-- Partial index on sold_date for counting recent sold listings (complements idx_listings_status_sold)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_sold_date_recent
  ON listings(sold_date DESC)
  WHERE status = 'sold' AND sold_date IS NOT NULL;

-- Replace get_avg_active_price() with a sampled version to avoid full-table-scan timeout.
-- Samples 5000 rows ordered by random() — fast, statistically sound at this scale.
CREATE OR REPLACE FUNCTION get_avg_active_price()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT ROUND(AVG(converted)::NUMERIC, 0)
  FROM (
    SELECT
      CASE
        WHEN currency IN ('SEK') OR (currency IS NULL AND location_country = 'SE') THEN price / 11.49
        WHEN currency IN ('NOK') OR (currency IS NULL AND location_country = 'NO') THEN price / 11.7
        WHEN currency IN ('DKK') OR (currency IS NULL AND location_country = 'DK') THEN price / 7.46
        WHEN currency IN ('CHF') OR (currency IS NULL AND location_country = 'CH') THEN price / 1.05
        WHEN currency IN ('PLN') OR (currency IS NULL AND location_country = 'PL') THEN price / 4.3
        ELSE price
      END AS converted
    FROM listings
    WHERE status = 'active'
      AND price IS NOT NULL
      AND price > 0
      AND price < 5000000
    LIMIT 5000
  ) sample;
$$;
