-- Table pour stocker les opportunités d'arbitrage auto-détectées
-- Remplie par le job arbitrageDetectionJob

CREATE TABLE IF NOT EXISTS arbitrage_opportunities_detected (
  id SERIAL PRIMARY KEY,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER,
  buy_country VARCHAR(2) NOT NULL,
  sell_country VARCHAR(2) NOT NULL,
  buy_median_price INTEGER NOT NULL,
  sell_median_price INTEGER NOT NULL,
  net_margin INTEGER NOT NULL,
  net_margin_pct NUMERIC(5,2),
  listing_count_buy INTEGER DEFAULT 0,
  listing_count_sell INTEGER DEFAULT 0,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arbitrage_opp_detected_margin ON arbitrage_opportunities_detected(net_margin DESC);
CREATE INDEX IF NOT EXISTS idx_arbitrage_opp_detected_at ON arbitrage_opportunities_detected(detected_at DESC);
