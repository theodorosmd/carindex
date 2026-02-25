-- Migration 011: Enhanced Price History and Listing Tracking
-- Adds fields for price drop detection, sale tracking, and DOM calculation

-- Add missing fields to listings table
ALTER TABLE listings 
  ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sold_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dom_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_drop_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_drop_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS last_price_drop_date TIMESTAMP;

-- Enhance price_history table with drop metadata
ALTER TABLE price_history
  ADD COLUMN IF NOT EXISTS drop_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS drop_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_first_seen ON listings(first_seen);
CREATE INDEX IF NOT EXISTS idx_listings_status_sold ON listings(status, sold_date) WHERE status = 'sold';
CREATE INDEX IF NOT EXISTS idx_listings_price_drop ON listings(price_drop_pct) WHERE price_drop_pct IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_price_history_drops ON price_history(listing_id, drop_pct) WHERE drop_pct > 0;
CREATE INDEX IF NOT EXISTS idx_price_history_recent ON price_history(listing_id, recorded_at DESC);

-- Update existing listings to set first_seen = created_at if null
UPDATE listings 
SET first_seen = created_at 
WHERE first_seen IS NULL AND created_at IS NOT NULL;
