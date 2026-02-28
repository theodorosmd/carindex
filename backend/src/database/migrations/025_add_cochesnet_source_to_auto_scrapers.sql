-- Migration: Add coches.net and gaspedaal sources to auto_scrapers table
-- coches.net - Spain's leading used car marketplace (250k+ listings)
-- gaspedaal.nl - Dutch car marketplace

ALTER TABLE auto_scrapers 
DROP CONSTRAINT IF EXISTS auto_scrapers_source_check;

ALTER TABLE auto_scrapers 
ADD CONSTRAINT auto_scrapers_source_check 
CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin', 'blocket', 'bilweb', 'bytbil', 'largus', 'subito', 'lacentrale', 'gaspedaal', 'coches.net'));

COMMENT ON CONSTRAINT auto_scrapers_source_check ON auto_scrapers IS 
'Allowed sources: autoscout24, mobile.de, leboncoin, largus, lacentrale (France), blocket, bilweb, bytbil (Sweden), subito (Italy), gaspedaal (Netherlands), coches.net (Spain)';
