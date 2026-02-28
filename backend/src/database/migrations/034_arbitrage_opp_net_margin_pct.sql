-- Fix numeric overflow: net_margin_pct can exceed 999.99 for high-margin arbitrage
ALTER TABLE arbitrage_opportunities_detected
  ALTER COLUMN net_margin_pct TYPE NUMERIC(10,2);
