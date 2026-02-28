-- Migration: Add FINN.no source to auto_scrapers table
-- FINN.no - Norway's largest car marketplace (Schibsted/Vend) - ~59k personbil listings

ALTER TABLE auto_scrapers 
DROP CONSTRAINT IF EXISTS auto_scrapers_source_check;

ALTER TABLE auto_scrapers 
ADD CONSTRAINT auto_scrapers_source_check 
CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin', 'blocket', 'bilweb', 'bytbil', 'largus', 'subito', 'lacentrale', 'gaspedaal', 'coches.net', 'finn'));

COMMENT ON CONSTRAINT auto_scrapers_source_check ON auto_scrapers IS 
'Allowed sources: autoscout24, mobile.de, leboncoin, largus, lacentrale (France), blocket, bilweb, bytbil (Sweden), subito (Italy), gaspedaal (Netherlands), coches.net (Spain), finn (Norway)';
