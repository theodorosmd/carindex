-- Migration: Allow NULL for year in listings
-- Previously year defaulted to 2000 when missing; we now store NULL for unknown years.

ALTER TABLE listings
ALTER COLUMN year DROP NOT NULL;

COMMENT ON COLUMN listings.year IS 'Vehicle model year (e.g. 2020). NULL when unknown.';
