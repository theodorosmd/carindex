-- Migration 009: Add French malus fields to auction_listings table
-- Adds columns for CO2 emissions, mass, and first registration date for French ecological malus calculation

-- Add CO2 emissions (WLTP) in g/km
ALTER TABLE auction_listings 
ADD COLUMN IF NOT EXISTS co2_g_km_wltp INTEGER;

-- Add mass in kg (for weight malus - not yet implemented)
ALTER TABLE auction_listings 
ADD COLUMN IF NOT EXISTS mass_kg INTEGER;

-- Add first registration date (for age-based discount calculation)
ALTER TABLE auction_listings 
ADD COLUMN IF NOT EXISTS first_registration_date DATE;

-- Add vehicle category (VP, VUL, etc.)
ALTER TABLE auction_listings 
ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(10) DEFAULT 'VP';

-- Add flag for first registration in France
ALTER TABLE auction_listings 
ADD COLUMN IF NOT EXISTS is_first_registration_in_france BOOLEAN DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN auction_listings.co2_g_km_wltp IS 'CO2 emissions in g/km (WLTP) for French ecological malus calculation';
COMMENT ON COLUMN auction_listings.mass_kg IS 'Vehicle mass in kg (for weight malus - not yet implemented)';
COMMENT ON COLUMN auction_listings.first_registration_date IS 'First registration date (abroad) for age-based discount calculation in French malus';
COMMENT ON COLUMN auction_listings.vehicle_category IS 'Vehicle category: VP (Véhicule particulier), VUL (Véhicule utilitaire léger), or OTHER';
COMMENT ON COLUMN auction_listings.is_first_registration_in_france IS 'Whether this is the first registration in France (affects malus calculation)';
