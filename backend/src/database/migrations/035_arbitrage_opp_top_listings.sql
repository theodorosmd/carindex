-- Store top listing URLs when job runs (so we have exact links at display time)
ALTER TABLE arbitrage_opportunities_detected
ADD COLUMN IF NOT EXISTS top_listings JSONB DEFAULT '[]';

COMMENT ON COLUMN arbitrage_opportunities_detected.top_listings IS 'Array of {url, trim, priceEur} for top 3 cheapest listings in buy country';
