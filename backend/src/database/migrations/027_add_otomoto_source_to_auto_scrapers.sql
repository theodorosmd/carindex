-- Migration: Add OtoMoto.pl source to auto_scrapers table
-- OtoMoto.pl - Poland's largest car marketplace (~200k+ listings, osobowe = passenger cars)
-- Uses scrape.do + AI enrichment (like largus, leboncoin)

ALTER TABLE auto_scrapers 
DROP CONSTRAINT IF EXISTS auto_scrapers_source_check;

ALTER TABLE auto_scrapers 
ADD CONSTRAINT auto_scrapers_source_check 
CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin', 'blocket', 'bilweb', 'bytbil', 'largus', 'subito', 'lacentrale', 'gaspedaal', 'coches.net', 'finn', 'otomoto'));

COMMENT ON CONSTRAINT auto_scrapers_source_check ON auto_scrapers IS 
'Allowed sources: autoscout24, mobile.de, leboncoin, largus, lacentrale (France), blocket, bilweb, bytbil (Sweden), subito (Italy), gaspedaal (Netherlands), coches.net (Spain), finn (Norway), otomoto (Poland)';
