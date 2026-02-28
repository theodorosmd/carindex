-- Migration: Add Marktplaats.nl source to auto_scrapers table
-- Marktplaats.nl - Netherlands' largest classifieds (Adevinta, ~249k autos, Te koop filter #f:10882)
-- Uses Puppeteer + scrape.do fallback, AI enrichment

ALTER TABLE auto_scrapers 
DROP CONSTRAINT IF EXISTS auto_scrapers_source_check;

ALTER TABLE auto_scrapers 
ADD CONSTRAINT auto_scrapers_source_check 
CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin', 'blocket', 'bilweb', 'bytbil', 'largus', 'subito', 'lacentrale', 'gaspedaal', 'marktplaats', 'coches.net', 'finn', 'otomoto', '2ememain'));

COMMENT ON CONSTRAINT auto_scrapers_source_check ON auto_scrapers IS 
'Allowed sources: autoscout24, mobile.de, leboncoin, largus, lacentrale (France), blocket, bilweb, bytbil (Sweden), subito (Italy), gaspedaal, marktplaats (Netherlands), coches.net (Spain), finn (Norway), otomoto (Poland), 2ememain (Belgium)';
