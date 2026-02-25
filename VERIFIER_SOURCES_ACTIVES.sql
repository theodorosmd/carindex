-- ============================================
-- Vérification des Sources Actives
-- ============================================

-- 1. Voir toutes les sources avec des annonces actives
SELECT 
  source_platform,
  location_country,
  COUNT(*) as active_listings,
  MAX(last_seen) as last_update
FROM listings
WHERE location_country IN ('FR', 'SE')
  AND status = 'active'
GROUP BY source_platform, location_country
ORDER BY location_country, active_listings DESC;

-- 2. Voir les scrapers automatiques configurés
SELECT 
  id,
  name,
  source,
  enabled,
  schedule_cron,
  last_run_at,
  last_run_status,
  last_run_result->>'totalScraped' as total_scraped,
  last_run_result->>'saved' as saved,
  array_length(search_urls, 1) as nb_urls
FROM auto_scrapers
ORDER BY enabled DESC, source, created_at;

-- 3. Voir les scrapers activés mais qui n'ont pas d'annonces actives
SELECT 
  s.source,
  s.name,
  s.enabled,
  s.last_run_at,
  s.last_run_status,
  COUNT(l.id) as active_listings_count
FROM auto_scrapers s
LEFT JOIN listings l ON l.source_platform = s.source 
  AND l.status = 'active' 
  AND l.location_country IN ('FR', 'SE')
WHERE s.enabled = true
GROUP BY s.id, s.source, s.name, s.enabled, s.last_run_at, s.last_run_status
ORDER BY active_listings_count ASC, s.source;

-- 4. Voir toutes les sources présentes dans la base (actives + vendues)
SELECT 
  source_platform,
  location_country,
  status,
  COUNT(*) as count,
  MAX(last_seen) as last_update
FROM listings
WHERE location_country IN ('FR', 'SE')
GROUP BY source_platform, location_country, status
ORDER BY location_country, source_platform, status;

-- 5. Voir les dernières annonces par source
SELECT 
  source_platform,
  location_country,
  brand,
  model,
  price,
  status,
  last_seen,
  first_seen
FROM listings
WHERE location_country IN ('FR', 'SE')
ORDER BY last_seen DESC
LIMIT 20;
