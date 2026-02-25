-- Migration 012: Add Watchlist and Enhanced Analytics Tables
-- Adds watchlist for model tracking and analytics tables for recommendations

-- Watchlist table (for tracking models)
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    notes TEXT,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, brand, model, year)
);

-- Watchlist history (track changes for watched models)
CREATE TABLE IF NOT EXISTS watchlist_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID REFERENCES watchlist(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'dom', 'price', 'velocity', 'rank'
    old_value DECIMAL(10,2),
    new_value DECIMAL(10,2),
    change_pct DECIMAL(5,2),
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_brand_model ON watchlist(brand, model);
CREATE INDEX IF NOT EXISTS idx_watchlist_history_watchlist ON watchlist_history(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_history_user ON watchlist_history(user_id, recorded_at DESC);
