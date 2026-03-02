-- Store total vehicles available on each marketplace (for % scraped display)
CREATE TABLE IF NOT EXISTS source_site_totals (
  source_platform TEXT PRIMARY KEY,
  total_available INTEGER NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- RLS: service role has full access
ALTER TABLE source_site_totals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON source_site_totals
  FOR ALL USING (true) WITH CHECK (true);
