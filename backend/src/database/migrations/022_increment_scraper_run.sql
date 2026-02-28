-- Fonction pour incrémenter atomiquement les compteurs d'un scraper_run (utilisé par le flux Python mobile.de)
CREATE OR REPLACE FUNCTION increment_scraper_run_counters(run_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE scraper_runs
  SET total_scraped = COALESCE(total_scraped, 0) + 1,
      total_saved = COALESCE(total_saved, 0) + 1,
      updated_at = NOW()
  WHERE id = run_uuid AND status = 'running';
END;
$$ LANGUAGE plpgsql;
