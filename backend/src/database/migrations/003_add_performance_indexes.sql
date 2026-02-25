-- Performance optimization indexes
-- These indexes improve query performance for common search patterns

-- Composite index for common search filters (brand, model, year, country, status)
CREATE INDEX IF NOT EXISTS idx_listings_search_composite ON listings(brand, model, year, location_country, status) WHERE status = 'active';

-- Composite index for price range queries
CREATE INDEX IF NOT EXISTS idx_listings_price_year ON listings(price, year) WHERE status = 'active' AND price > 0;

-- Composite index for mileage and year queries
CREATE INDEX IF NOT EXISTS idx_listings_mileage_year ON listings(mileage, year) WHERE status = 'active';

-- Index for fuel_type and transmission (common filters)
CREATE INDEX IF NOT EXISTS idx_listings_fuel_transmission ON listings(fuel_type, transmission) WHERE status = 'active';

-- Index for version and trim (new filters)
CREATE INDEX IF NOT EXISTS idx_listings_version_trim ON listings(version, trim) WHERE status = 'active';

-- Index for color filter
CREATE INDEX IF NOT EXISTS idx_listings_color ON listings(color) WHERE status = 'active' AND color IS NOT NULL;

-- Index for steering filter
CREATE INDEX IF NOT EXISTS idx_listings_steering ON listings(steering) WHERE status = 'active' AND steering IS NOT NULL;

-- Index for seller_type filter
CREATE INDEX IF NOT EXISTS idx_listings_seller_type_active ON listings(seller_type) WHERE status = 'active' AND seller_type IS NOT NULL;

-- Index for posted_date with status (for sorting)
CREATE INDEX IF NOT EXISTS idx_listings_posted_date_active ON listings(posted_date DESC) WHERE status = 'active';

-- Index for location queries (country + city)
CREATE INDEX IF NOT EXISTS idx_listings_location_composite ON listings(location_country, location_city) WHERE status = 'active';

-- Index for market price calculations (brand, model, year, country, mileage range)
CREATE INDEX IF NOT EXISTS idx_listings_market_price_lookup ON listings(brand, model, year, location_country, mileage, price) 
WHERE status = 'active' AND price > 0;

-- Index for price history queries
CREATE INDEX IF NOT EXISTS idx_price_history_listing_date ON price_history(listing_id, recorded_at DESC);

-- Index for user searches
CREATE INDEX IF NOT EXISTS idx_user_searches_user_date ON user_searches(user_id, created_at DESC);

-- Index for favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user_listing ON favorites(user_id, listing_id);

-- Index for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON alerts(user_id, status) WHERE status = 'active';







