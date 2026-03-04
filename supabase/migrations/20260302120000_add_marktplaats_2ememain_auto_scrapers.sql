-- Créer les auto_scrapers pour Marktplaats et 2ememain s'ils n'existent pas
-- Permet de les afficher avec bouton Pause/Reprendre dans le dashboard scraper
-- Met à jour la contrainte source si elle n'inclut pas encore marktplaats/2ememain

ALTER TABLE auto_scrapers DROP CONSTRAINT IF EXISTS auto_scrapers_source_check;
ALTER TABLE auto_scrapers ADD CONSTRAINT auto_scrapers_source_check
  CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin', 'blocket', 'bilweb', 'bytbil', 'largus', 'subito', 'lacentrale', 'gaspedaal', 'marktplaats', 'coches.net', 'finn', 'otomoto', '2ememain'));

INSERT INTO auto_scrapers (source, name, search_urls, schedule_cron, max_results, result_limit_per_thread, enabled)
SELECT 'marktplaats', 'Marktplaats.nl - principal', ARRAY['https://www.marktplaats.nl/l/auto-s/#f:10882'], '24 */6 * * *', 999999, 10000, false
WHERE NOT EXISTS (SELECT 1 FROM auto_scrapers WHERE source = 'marktplaats');

INSERT INTO auto_scrapers (source, name, search_urls, schedule_cron, max_results, result_limit_per_thread, enabled)
SELECT '2ememain', '2ememain.be - principal', ARRAY['https://www.2ememain.be/l/autos/#f:10882'], '56 */6 * * *', 999999, 10000, false
WHERE NOT EXISTS (SELECT 1 FROM auto_scrapers WHERE source = '2ememain');
