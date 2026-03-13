-- Migration 036: SQL RPC functions for facets aggregation and average price
-- Replaces JS-side sampling (3000 rows out of 600k) with proper GROUP BY in SQL.
-- Used by facetsService.js (no-filter path) and getGlobalStats().

-- ─────────────────────────────────────────────────────────
-- 1. get_listing_facets_counts()
--    Returns GROUP BY counts for all facet fields in one round-trip.
--    Called when no search filters are active (most common: initial page load).
--    Raw values returned; normalization (fuel_type, transmission) done in JS.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_listing_facets_counts()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT jsonb_build_object(
    'total', (
      SELECT COUNT(*)::BIGINT FROM listings WHERE status = 'active'
    ),
    'brands', (
      SELECT COALESCE(jsonb_object_agg(brand, cnt), '{}')
      FROM (
        SELECT brand, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND brand IS NOT NULL
        GROUP BY brand
      ) t
    ),
    'models', (
      SELECT COALESCE(jsonb_object_agg(brand_model, cnt), '{}')
      FROM (
        SELECT brand || ' ' || model AS brand_model, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND brand IS NOT NULL AND model IS NOT NULL
        GROUP BY brand, model
        ORDER BY cnt DESC
        LIMIT 1000
      ) t
    ),
    'countries', (
      SELECT COALESCE(jsonb_object_agg(location_country, cnt), '{}')
      FROM (
        SELECT location_country, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND location_country IS NOT NULL AND location_country != ''
        GROUP BY location_country
      ) t
    ),
    'fuel_types', (
      SELECT COALESCE(jsonb_object_agg(fuel_type, cnt), '{}')
      FROM (
        SELECT fuel_type, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND fuel_type IS NOT NULL AND fuel_type != ''
        GROUP BY fuel_type
      ) t
    ),
    'transmissions', (
      SELECT COALESCE(jsonb_object_agg(transmission, cnt), '{}')
      FROM (
        SELECT transmission, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND transmission IS NOT NULL AND transmission != ''
        GROUP BY transmission
      ) t
    ),
    'steering_values', (
      SELECT COALESCE(jsonb_object_agg(steering, cnt), '{}')
      FROM (
        SELECT steering, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND steering IS NOT NULL AND steering != ''
        GROUP BY steering
      ) t
    ),
    'doors_values', (
      SELECT COALESCE(jsonb_object_agg(doors::TEXT, cnt), '{}')
      FROM (
        SELECT doors, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND doors IS NOT NULL AND doors > 0
        GROUP BY doors
      ) t
    ),
    'seller_types', (
      SELECT COALESCE(jsonb_object_agg(seller_type, cnt), '{}')
      FROM (
        SELECT seller_type, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND seller_type IS NOT NULL AND seller_type != ''
        GROUP BY seller_type
      ) t
    ),
    'colors', (
      SELECT COALESCE(jsonb_object_agg(color, cnt), '{}')
      FROM (
        SELECT color, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND color IS NOT NULL AND color != ''
        GROUP BY color
        ORDER BY cnt DESC
        LIMIT 200
      ) t
    ),
    'categories', (
      SELECT COALESCE(jsonb_object_agg(category, cnt), '{}')
      FROM (
        SELECT category, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND category IS NOT NULL AND category != ''
        GROUP BY category
      ) t
    ),
    'drivetrains', (
      SELECT COALESCE(jsonb_object_agg(drivetrain, cnt), '{}')
      FROM (
        SELECT drivetrain, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND drivetrain IS NOT NULL AND drivetrain != ''
        GROUP BY drivetrain
      ) t
    ),
    'versions', (
      SELECT COALESCE(jsonb_object_agg(version, cnt), '{}')
      FROM (
        SELECT version, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND version IS NOT NULL AND version != ''
        GROUP BY version
        ORDER BY cnt DESC
        LIMIT 500
      ) t
    ),
    'trims', (
      SELECT COALESCE(jsonb_object_agg(trim, cnt), '{}')
      FROM (
        SELECT trim, COUNT(*)::BIGINT AS cnt
        FROM listings
        WHERE status = 'active' AND trim IS NOT NULL AND trim != ''
        GROUP BY trim
        ORDER BY cnt DESC
        LIMIT 500
      ) t
    ),
    'recent_count', (
      SELECT COUNT(*)::BIGINT
      FROM listings
      WHERE status = 'active' AND posted_date >= NOW() - INTERVAL '30 days'
    ),
    'old_count', (
      SELECT COUNT(*)::BIGINT
      FROM listings
      WHERE status = 'active' AND (posted_date < NOW() - INTERVAL '30 days' OR posted_date IS NULL)
    )
  );
$$;

-- ─────────────────────────────────────────────────────────
-- 2. get_avg_active_price()
--    Returns the average price of all active listings with price > 0.
--    Used by getGlobalStats() to replace the JS-side .limit(10000) sampling.
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_avg_active_price()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  -- Convert non-EUR currencies to EUR before averaging
  SELECT ROUND(AVG(
    CASE
      WHEN currency IN ('SEK') OR (currency IS NULL AND location_country = 'SE') THEN price / 11.49
      WHEN currency IN ('NOK') OR (currency IS NULL AND location_country = 'NO') THEN price / 11.7
      WHEN currency IN ('DKK') OR (currency IS NULL AND location_country = 'DK') THEN price / 7.46
      WHEN currency IN ('CHF') OR (currency IS NULL AND location_country = 'CH') THEN price / 1.05
      WHEN currency IN ('PLN') OR (currency IS NULL AND location_country = 'PL') THEN price / 4.3
      ELSE price
    END
  )::NUMERIC, 0)
  FROM listings
  WHERE status = 'active' AND price IS NOT NULL AND price > 0 AND price < 5000000;
$$;
