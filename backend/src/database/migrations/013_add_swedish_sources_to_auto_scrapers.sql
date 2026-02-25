-- Migration: Add Swedish sources (blocket, bilweb, bytbil) to auto_scrapers table
-- This updates the CHECK constraint to allow the new Swedish scraper sources

-- Drop the old constraint
ALTER TABLE auto_scrapers 
DROP CONSTRAINT IF EXISTS auto_scrapers_source_check;

-- Add the new constraint with all sources
ALTER TABLE auto_scrapers 
ADD CONSTRAINT auto_scrapers_source_check 
CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin', 'blocket', 'bilweb', 'bytbil'));

-- Add a comment to document the change
COMMENT ON CONSTRAINT auto_scrapers_source_check ON auto_scrapers IS 
'Allowed sources: autoscout24, mobile.de, leboncoin (France/Germany), blocket, bilweb, bytbil (Sweden)';
