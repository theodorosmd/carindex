-- Migration: Add 2ememain.be source to auto_scrapers table
-- 2ememain.be - Belgium's largest classifieds (Adevinta, ~94k autos, Achat filter #f:10882)
-- Uses scrape.do + AI enrichment (like leboncoin, largus)

ALTER TABLE auto_scrapers 
DROP CONSTRAINT IF EXISTS auto_scrapers_source_check;

ALTER TABLE auto_scrapers 
ADD CONSTRAINT auto_scrapers_source_check 
CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin', 'blocket', 'bilweb', 'bytbil', 'largus', 'subito', 'lacentrale', 'gaspedaal', 'coches.net', 'finn', 'otomoto', '2ememain'));

COMMENT ON CONSTRAINT auto_scrapers_source_check ON auto_scrapers IS 
'Allowed sources: autoscout24, mobile.de, leboncoin, largus, lacentrale (France), blocket, bilweb, bytbil (Sweden), subito (Italy), gaspedaal (Netherlands), coches.net (Spain), finn (Norway), otomoto (Poland), 2ememain (Belgium)';
