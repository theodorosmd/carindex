-- Migration: Add L'Argus (largus) source to auto_scrapers table
-- occasion.largus.fr - French used car marketplace

ALTER TABLE auto_scrapers 
DROP CONSTRAINT IF EXISTS auto_scrapers_source_check;

ALTER TABLE auto_scrapers 
ADD CONSTRAINT auto_scrapers_source_check 
CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin', 'blocket', 'bilweb', 'bytbil', 'largus'));

COMMENT ON CONSTRAINT auto_scrapers_source_check ON auto_scrapers IS 
'Allowed sources: autoscout24, mobile.de, leboncoin, largus (France/Germany), blocket, bilweb, bytbil (Sweden)';
