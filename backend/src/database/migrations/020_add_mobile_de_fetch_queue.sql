-- Queue pour remplacer Django Car : 1_collect_results ajoute des URLs,
-- 2_collect_details consomme et envoie vers raw_listings.

CREATE TABLE IF NOT EXISTS mobile_de_fetch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  year INTEGER,
  price DECIMAL(12,2),
  mileage INTEGER,
  images JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'retry', 'processing', 'ok', 'error')),
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  last_error TEXT,
  last_attempt_at TIMESTAMP,
  locked_until TIMESTAMP,
  locked_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobilede_queue_status ON mobile_de_fetch_queue(status);
CREATE INDEX IF NOT EXISTS idx_mobilede_queue_next_retry ON mobile_de_fetch_queue(next_retry_at) WHERE status IN ('pending', 'retry');
CREATE INDEX IF NOT EXISTS idx_mobilede_queue_available ON mobile_de_fetch_queue(created_at) WHERE status IN ('pending', 'retry') AND (next_retry_at IS NULL OR next_retry_at <= NOW());

COMMENT ON TABLE mobile_de_fetch_queue IS 'Queue de URLs mobile.de à enrichir (remplace Django Car). 1_collect_results ajoute, 2_collect_details consomme.';
