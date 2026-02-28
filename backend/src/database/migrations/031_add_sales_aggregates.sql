-- Table for accumulating sales averages (DOM, price) per country
-- Updated incrementally when listings are marked as sold

CREATE TABLE IF NOT EXISTS sales_aggregates (
  location_country VARCHAR(2) PRIMARY KEY,
  total_sales INTEGER NOT NULL DEFAULT 0,
  sum_dom_days BIGINT NOT NULL DEFAULT 0,
  sum_price_eur NUMERIC(14,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Index for last_updated (optional, for cleanup/audit)
CREATE INDEX IF NOT EXISTS idx_sales_aggregates_updated ON sales_aggregates(last_updated);

COMMENT ON TABLE sales_aggregates IS 'Running aggregates of sold listings per country: total_sales, sum_dom_days, sum_price_eur for fast avg DOM and avg price';
