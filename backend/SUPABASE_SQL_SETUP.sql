-- ============================================
-- Carindex Supabase Setup Script
-- ============================================
-- Copiez et exécutez ce script dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/jgrebihiurfmuhfftsoa/sql

-- ============================================
-- 1. SCHÉMA PRINCIPAL
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'start',
    api_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_platform VARCHAR(50) NOT NULL,
    source_listing_id VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    mileage INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    location_city VARCHAR(100),
    location_region VARCHAR(100),
    location_country VARCHAR(2) NOT NULL,
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    seller_type VARCHAR(20),
    fuel_type VARCHAR(20),
    transmission VARCHAR(20),
    steering VARCHAR(10),
    doors INTEGER,
    color VARCHAR(50),
    power_hp INTEGER,
    displacement DECIMAL(4,2),
    version VARCHAR(100),
    trim VARCHAR(100),
    category VARCHAR(50),
    drivetrain VARCHAR(20),
    url TEXT,
    images JSONB,
    specifications JSONB,
    description TEXT,
    posted_date TIMESTAMP,
    last_seen TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active',
    fingerprint VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_platform, source_listing_id)
);

-- Market prices (calculated)
CREATE TABLE IF NOT EXISTS market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    mileage_range_start INTEGER NOT NULL,
    mileage_range_end INTEGER NOT NULL,
    country VARCHAR(2) NOT NULL,
    market_price DECIMAL(10,2) NOT NULL,
    confidence_index INTEGER NOT NULL,
    comparables_count INTEGER NOT NULL,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    price_median DECIMAL(10,2),
    average_sales_time_days INTEGER,
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(brand, model, year, mileage_range_start, mileage_range_end, country)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    criteria JSONB NOT NULL,
    threshold JSONB,
    webhook_url TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Alert events table
CREATE TABLE IF NOT EXISTS alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Price history table
CREATE TABLE IF NOT EXISTS price_history (
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (listing_id, recorded_at)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_listings_brand_model ON listings(brand, model);
CREATE INDEX IF NOT EXISTS idx_listings_country ON listings(location_country);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_posted_date ON listings(posted_date);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_year ON listings(year);
CREATE INDEX IF NOT EXISTS idx_listings_mileage ON listings(mileage);
CREATE INDEX IF NOT EXISTS idx_listings_fuel_type ON listings(fuel_type);
CREATE INDEX IF NOT EXISTS idx_listings_transmission ON listings(transmission);
CREATE INDEX IF NOT EXISTS idx_listings_seller_type ON listings(seller_type);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location_country, location_city);
CREATE INDEX IF NOT EXISTS idx_listings_text_search ON listings USING gin(to_tsvector('french', coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_market_prices_lookup ON market_prices(brand, model, year, country);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_alert ON alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_user ON alert_events(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON favorites(listing_id);

-- ============================================
-- 3. COMMENTS
-- ============================================

COMMENT ON COLUMN listings.fuel_type IS 'Type of fuel: petrol, diesel, hybrid, electric';
COMMENT ON COLUMN listings.transmission IS 'Transmission type: automatic, manual';
COMMENT ON COLUMN listings.steering IS 'Steering position: LHD, RHD';
COMMENT ON COLUMN listings.seller_type IS 'Seller type: private, professional';

-- ============================================
-- ✅ Setup terminé !
-- ============================================

SELECT 'Database setup completed successfully!' as status;








