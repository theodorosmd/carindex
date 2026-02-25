-- Table pour stocker les configurations de scraping automatique
CREATE TABLE IF NOT EXISTS auto_scrapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL CHECK (source IN ('autoscout24', 'mobile.de', 'leboncoin')),
  name VARCHAR(255) NOT NULL,
  search_urls TEXT[] NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL, -- Format cron: "0 */6 * * *" (toutes les 6 heures)
  max_results INTEGER DEFAULT 1000, -- Nombre max d'annonces par URL (le scraper parcourt toutes les pages automatiquement)
  result_limit_per_thread INTEGER DEFAULT 100, -- Limite par thread de scraping
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20), -- 'success', 'error', 'running'
  last_run_result JSONB, -- { totalScraped: 100, saved: 95, error: null }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auto_scrapers_source ON auto_scrapers(source);
CREATE INDEX IF NOT EXISTS idx_auto_scrapers_enabled ON auto_scrapers(enabled) WHERE enabled = true;

