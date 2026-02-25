-- Migration 008: Add user management and naming for margin calculations
-- Allows users to save, manage, and compare evaluations

-- Add user_id and name to margin_calculations
ALTER TABLE margin_calculations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_margin_calculations_user_id ON margin_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_margin_calculations_user_created ON margin_calculations(user_id, created_at DESC);

-- Add updated_at for tracking modifications
ALTER TABLE margin_calculations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
