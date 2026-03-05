-- Queue Leboncoin : phase recherche ajoute des URLs, workers fetchent les détails.
-- Similaire à mobile_de_fetch_queue mais les workers doivent fetcher (pas de __INITIAL_STATE__).

CREATE TABLE IF NOT EXISTS leboncoin_fetch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  price DECIMAL(12,2),
  mileage INTEGER,
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

CREATE INDEX IF NOT EXISTS idx_leboncoin_queue_status ON leboncoin_fetch_queue(status);
CREATE INDEX IF NOT EXISTS idx_leboncoin_queue_next_retry ON leboncoin_fetch_queue(next_retry_at) WHERE status IN ('pending', 'retry');
CREATE INDEX IF NOT EXISTS idx_leboncoin_queue_available ON leboncoin_fetch_queue(created_at) WHERE status IN ('pending', 'retry');

COMMENT ON TABLE leboncoin_fetch_queue IS 'Queue Leboncoin: recherche ajoute URLs, workers fetchent détails (scrape.do).';
