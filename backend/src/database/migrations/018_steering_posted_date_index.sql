-- Composite index for steering filter + sort by posted_date
-- Improves performance when filtering by steering (LHD/RHD) and sorting by most recent
-- The existing idx_listings_steering helps filter, but this allows index-only scan for filter+sort
CREATE INDEX IF NOT EXISTS idx_listings_steering_posted ON listings(steering, posted_date DESC) 
WHERE status = 'active' AND steering IS NOT NULL;
