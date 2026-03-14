-- 039: Subscription billing tables for Stripe integration
-- Adds 'dealer' plan tier, stripe_customer_id on users, and subscriptions tracking table

-- Add 'dealer' to the plan enum (safe: IF NOT EXISTS guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'dealer'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'plan_type')
  ) THEN
    ALTER TYPE plan_type ADD VALUE 'dealer';
  END IF;
END$$;

-- Add Stripe customer ID to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Subscriptions table: tracks Stripe subscription lifecycle per user
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT        UNIQUE,
  stripe_customer_id      TEXT,
  plan                    TEXT        NOT NULL DEFAULT 'starter',
  status                  TEXT        NOT NULL DEFAULT 'active',
  -- status values: active | trialing | past_due | cancelled | incomplete
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN     DEFAULT FALSE,
  trial_end               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id  ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON subscriptions(status) WHERE status IN ('active', 'trialing');
