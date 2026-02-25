-- Add max_results and result_limit_per_thread columns to auto_scrapers table
-- These columns were missing from the initial migration

ALTER TABLE auto_scrapers 
ADD COLUMN IF NOT EXISTS max_results INTEGER DEFAULT 1000;

ALTER TABLE auto_scrapers 
ADD COLUMN IF NOT EXISTS result_limit_per_thread INTEGER DEFAULT 100;

-- Update existing records to have default values if they are NULL
UPDATE auto_scrapers 
SET max_results = 1000 
WHERE max_results IS NULL;

UPDATE auto_scrapers 
SET result_limit_per_thread = 100 
WHERE result_limit_per_thread IS NULL;







