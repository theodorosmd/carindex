-- Migration: Add missing fields to listings table
-- Run this migration to add all the new columns needed for the enhanced search functionality

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Location fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='location_region') THEN
        ALTER TABLE listings ADD COLUMN location_region VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='location_latitude') THEN
        ALTER TABLE listings ADD COLUMN location_latitude DECIMAL(10,8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='location_longitude') THEN
        ALTER TABLE listings ADD COLUMN location_longitude DECIMAL(11,8);
    END IF;
    
    -- Vehicle specification fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='fuel_type') THEN
        ALTER TABLE listings ADD COLUMN fuel_type VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='transmission') THEN
        ALTER TABLE listings ADD COLUMN transmission VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='steering') THEN
        ALTER TABLE listings ADD COLUMN steering VARCHAR(10);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='doors') THEN
        ALTER TABLE listings ADD COLUMN doors INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='color') THEN
        ALTER TABLE listings ADD COLUMN color VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='power_hp') THEN
        ALTER TABLE listings ADD COLUMN power_hp INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='displacement') THEN
        ALTER TABLE listings ADD COLUMN displacement DECIMAL(4,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='version') THEN
        ALTER TABLE listings ADD COLUMN version VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='trim') THEN
        ALTER TABLE listings ADD COLUMN trim VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='category') THEN
        ALTER TABLE listings ADD COLUMN category VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='drivetrain') THEN
        ALTER TABLE listings ADD COLUMN drivetrain VARCHAR(20);
    END IF;
    
    -- Description for text search
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='description') THEN
        ALTER TABLE listings ADD COLUMN description TEXT;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_year ON listings(year);
CREATE INDEX IF NOT EXISTS idx_listings_mileage ON listings(mileage);
CREATE INDEX IF NOT EXISTS idx_listings_fuel_type ON listings(fuel_type);
CREATE INDEX IF NOT EXISTS idx_listings_transmission ON listings(transmission);
CREATE INDEX IF NOT EXISTS idx_listings_seller_type ON listings(seller_type);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location_country, location_city);
CREATE INDEX IF NOT EXISTS idx_listings_text_search ON listings USING gin(to_tsvector('french', coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' || coalesce(description, '')));

-- Add comment
COMMENT ON COLUMN listings.fuel_type IS 'Type of fuel: petrol, diesel, hybrid, electric';
COMMENT ON COLUMN listings.transmission IS 'Transmission type: automatic, manual';
COMMENT ON COLUMN listings.steering IS 'Steering position: LHD, RHD';
COMMENT ON COLUMN listings.seller_type IS 'Seller type: private, professional';








