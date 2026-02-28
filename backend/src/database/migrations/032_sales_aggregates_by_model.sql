-- Replace sales_aggregates with granular structure: same brand, model, fuel, trim, engine, country
-- Engine = version (motorisation) or fallback displacement_power

DROP TABLE IF EXISTS sales_aggregates;

CREATE TABLE sales_aggregates (
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  fuel_type VARCHAR(50) NOT NULL DEFAULT '',
  trim VARCHAR(255) NOT NULL DEFAULT '',
  engine VARCHAR(100) NOT NULL DEFAULT '',
  location_country VARCHAR(2) NOT NULL,
  total_sales INTEGER NOT NULL DEFAULT 0,
  sum_dom_days BIGINT NOT NULL DEFAULT 0,
  sum_price_eur NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (brand, model, fuel_type, trim, engine, location_country)
);

CREATE INDEX IF NOT EXISTS idx_sales_aggregates_country ON sales_aggregates(location_country);
CREATE INDEX IF NOT EXISTS idx_sales_aggregates_brand_model ON sales_aggregates(brand, model);

COMMENT ON TABLE sales_aggregates IS 'Aggregats des ventes par marque, modèle, carburant, finition, moteur, pays';
