-- 037: Saved searches and price alerts
-- Users can save search filters and get notified when new matching listings appear

CREATE TABLE IF NOT EXISTS saved_searches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         VARCHAR(200) NOT NULL,
  filters      JSONB NOT NULL DEFAULT '{}', -- search params (brand, model, year, price, country etc.)
  alert_email  BOOLEAN NOT NULL DEFAULT false, -- send email for new matches
  alert_push   BOOLEAN NOT NULL DEFAULT false,
  last_checked TIMESTAMPTZ,
  new_count    INTEGER NOT NULL DEFAULT 0,   -- unseen listings since last_checked
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alert ON saved_searches(alert_email) WHERE alert_email = true;

-- RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_saved_searches" ON saved_searches
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
