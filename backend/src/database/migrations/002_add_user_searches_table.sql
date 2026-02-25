-- Migration: Add user_searches table for dashboard
-- This table stores user search history for the dashboard

CREATE TABLE IF NOT EXISTS user_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  search_criteria JSONB NOT NULL,
  results_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_searches_user ON user_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_searches_created ON user_searches(created_at DESC);







