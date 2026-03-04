-- Focus sur 6 sources : blocket, leboncoin, autoscout24, largus, lacentrale, mobile.de
-- Pause les autres : bytbil, bilweb, subito, gaspedaal, marktplaats, coches.net, finn, otomoto, 2ememain
UPDATE auto_scrapers
SET enabled = (source IN ('blocket', 'leboncoin', 'autoscout24', 'largus', 'lacentrale', 'mobile.de'));
